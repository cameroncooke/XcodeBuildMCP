import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../../utils/logger.ts';
import {
  createErrorResponse,
  createTextResponse,
  type ToolResponse,
} from '../../utils/responses/index.ts';
import { XcodeToolsProxyRegistry, type ProxySyncResult } from './registry.ts';
import {
  buildXcodeToolsBridgeStatus,
  classifyBridgeError,
  getMcpBridgeAvailability,
  type XcodeToolsBridgeStatus,
} from './core.ts';
import { XcodeIdeToolService } from './tool-service.ts';

export class XcodeToolsBridgeManager {
  private readonly server: McpServer;
  private readonly registry: XcodeToolsProxyRegistry;
  private readonly service: XcodeIdeToolService;

  private workflowEnabled = false;
  private lastError: string | null = null;
  private syncInFlight: Promise<ProxySyncResult> | null = null;

  constructor(server: McpServer) {
    this.server = server;
    this.registry = new XcodeToolsProxyRegistry(server);
    this.service = new XcodeIdeToolService({
      onToolCatalogInvalidated: (): void => {
        void this.syncTools({ reason: 'listChanged' });
      },
    });
  }

  setWorkflowEnabled(enabled: boolean): void {
    this.workflowEnabled = enabled;
    this.service.setWorkflowEnabled(enabled);
  }

  async shutdown(): Promise<void> {
    this.registry.clear();
    await this.service.disconnect();
  }

  async getStatus(): Promise<XcodeToolsBridgeStatus> {
    return buildXcodeToolsBridgeStatus({
      workflowEnabled: this.workflowEnabled,
      proxiedToolCount: this.registry.getRegisteredCount(),
      lastError: this.lastError ?? this.service.getLastError(),
      clientStatus: this.service.getClientStatus(),
    });
  }

  async syncTools(opts: {
    reason: 'startup' | 'manual' | 'listChanged';
  }): Promise<ProxySyncResult> {
    if (!this.workflowEnabled) {
      throw new Error('xcode-ide workflow is not enabled');
    }

    if (this.syncInFlight) return this.syncInFlight;

    this.syncInFlight = (async (): Promise<ProxySyncResult> => {
      const bridge = await getMcpBridgeAvailability();
      if (!bridge.available) {
        this.lastError = 'mcpbridge not available (xcrun --find mcpbridge failed)';
        const existingCount = this.registry.getRegisteredCount();
        this.registry.clear();
        this.server.sendToolListChanged();
        return { added: 0, updated: 0, removed: existingCount, total: 0 };
      }

      try {
        const remoteTools = await this.service.listTools({ refresh: true });

        const sync = this.registry.sync(remoteTools, async (remoteName, args) => {
          return this.service.invokeTool(remoteName, args);
        });

        if (opts.reason !== 'listChanged') {
          log(
            'info',
            `[xcode-ide] Synced proxied tools (added=${sync.added}, updated=${sync.updated}, removed=${sync.removed}, total=${sync.total})`,
          );
        }

        this.lastError = null;
        // Notify clients that our own tool list changed.
        this.server.sendToolListChanged();

        return sync;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.lastError = message;
        log('warn', `[xcode-ide] Tool sync failed: ${message}`);
        this.registry.clear();
        this.server.sendToolListChanged();
        return { added: 0, updated: 0, removed: 0, total: 0 };
      } finally {
        this.syncInFlight = null;
      }
    })();

    return this.syncInFlight;
  }

  async disconnect(): Promise<void> {
    this.registry.clear();
    this.server.sendToolListChanged();
    await this.service.disconnect();
  }

  async statusTool(): Promise<ToolResponse> {
    const status = await this.getStatus();
    return createTextResponse(JSON.stringify(status, null, 2));
  }

  async syncTool(): Promise<ToolResponse> {
    try {
      const sync = await this.syncTools({ reason: 'manual' });
      const status = await this.getStatus();
      return createTextResponse(
        JSON.stringify(
          {
            sync,
            status,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResponse('Bridge sync failed', message);
    }
  }

  async disconnectTool(): Promise<ToolResponse> {
    try {
      await this.disconnect();
      const status = await this.getStatus();
      return createTextResponse(JSON.stringify(status, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResponse('Bridge disconnect failed', message);
    }
  }

  async listToolsTool(params: { refresh?: boolean }): Promise<ToolResponse> {
    if (!this.workflowEnabled) {
      return this.createBridgeFailureResponse(
        'XCODE_MCP_UNAVAILABLE',
        'xcode-ide workflow is not enabled',
      );
    }

    try {
      const tools = await this.service.listTools({ refresh: params.refresh !== false });
      const payload = {
        toolCount: tools.length,
        tools: tools.map((tool) => this.serializeTool(tool)),
      };
      return createTextResponse(JSON.stringify(payload, null, 2));
    } catch (error) {
      return this.createBridgeFailureResponse(
        classifyBridgeError(error, 'list', {
          connected: this.service.getClientStatus().connected,
        }),
        error,
      );
    }
  }

  async callToolTool(params: {
    remoteTool: string;
    arguments: Record<string, unknown>;
    timeoutMs?: number;
  }): Promise<ToolResponse> {
    if (!this.workflowEnabled) {
      return this.createBridgeFailureResponse(
        'XCODE_MCP_UNAVAILABLE',
        'xcode-ide workflow is not enabled',
      );
    }

    try {
      const response = await this.service.invokeTool(params.remoteTool, params.arguments, {
        timeoutMs: params.timeoutMs,
      });
      return response as ToolResponse;
    } catch (error) {
      return this.createBridgeFailureResponse(
        classifyBridgeError(error, 'call', {
          connected: this.service.getClientStatus().connected,
        }),
        error,
      );
    }
  }

  private serializeTool(tool: Tool): Record<string, unknown> {
    return {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      annotations: tool.annotations,
    };
  }

  private createBridgeFailureResponse(code: string, error: unknown): ToolResponse {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse(code, message);
  }
}
