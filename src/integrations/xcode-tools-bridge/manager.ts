import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../../utils/logger.ts';
import {
  createErrorResponse,
  createTextResponse,
  type ToolResponse,
} from '../../utils/responses/index.ts';
import { XcodeToolsBridgeClient } from './client.ts';
import { XcodeToolsProxyRegistry, type ProxySyncResult } from './registry.ts';
import {
  buildXcodeToolsBridgeStatus,
  getMcpBridgeAvailability,
  type XcodeToolsBridgeStatus,
} from './core.ts';

export class XcodeToolsBridgeManager {
  private readonly server: McpServer;
  private readonly client: XcodeToolsBridgeClient;
  private readonly registry: XcodeToolsProxyRegistry;

  private workflowEnabled = false;
  private lastError: string | null = null;
  private syncInFlight: Promise<ProxySyncResult> | null = null;

  constructor(server: McpServer) {
    this.server = server;
    this.registry = new XcodeToolsProxyRegistry(server);
    this.client = new XcodeToolsBridgeClient({
      onToolsListChanged: (): void => {
        void this.syncTools({ reason: 'listChanged' });
      },
      onBridgeClosed: (): void => {
        this.registry.clear();
        this.lastError = this.client.getStatus().lastError ?? this.lastError;
      },
    });
  }

  setWorkflowEnabled(enabled: boolean): void {
    this.workflowEnabled = enabled;
  }

  async shutdown(): Promise<void> {
    this.registry.clear();
    await this.client.disconnect();
  }

  async getStatus(): Promise<XcodeToolsBridgeStatus> {
    return buildXcodeToolsBridgeStatus({
      workflowEnabled: this.workflowEnabled,
      proxiedToolCount: this.registry.getRegisteredCount(),
      lastError: this.lastError,
      clientStatus: this.client.getStatus(),
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
        await this.client.connectOnce();
        const remoteTools = await this.client.listTools();

        const sync = this.registry.sync(remoteTools, async (remoteName, args) => {
          return this.client.callTool(remoteName, args);
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
    await this.client.disconnect();
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
}
