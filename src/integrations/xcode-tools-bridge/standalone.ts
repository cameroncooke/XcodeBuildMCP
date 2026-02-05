import {
  createErrorResponse,
  createTextResponse,
  type ToolResponse,
} from '../../utils/responses/index.ts';
import { XcodeToolsBridgeClient } from './client.ts';
import {
  buildXcodeToolsBridgeStatus,
  getMcpBridgeAvailability,
  type XcodeToolsBridgeStatus,
} from './core.ts';

export class StandaloneXcodeToolsBridge {
  private readonly client: XcodeToolsBridgeClient;
  private lastError: string | null = null;

  constructor() {
    this.client = new XcodeToolsBridgeClient({
      onBridgeClosed: (): void => {
        this.lastError = this.client.getStatus().lastError ?? this.lastError;
      },
    });
  }

  async shutdown(): Promise<void> {
    await this.client.disconnect();
  }

  async getStatus(): Promise<XcodeToolsBridgeStatus> {
    return buildXcodeToolsBridgeStatus({
      workflowEnabled: false,
      proxiedToolCount: 0,
      lastError: this.lastError,
      clientStatus: this.client.getStatus(),
    });
  }

  async statusTool(): Promise<ToolResponse> {
    const status = await this.getStatus();
    return createTextResponse(JSON.stringify(status, null, 2));
  }

  async syncTool(): Promise<ToolResponse> {
    try {
      const bridge = await getMcpBridgeAvailability();
      if (!bridge.available) {
        this.lastError = 'mcpbridge not available (xcrun --find mcpbridge failed)';
        return createErrorResponse('Bridge sync failed', this.lastError);
      }

      await this.client.connectOnce();
      const remoteTools = await this.client.listTools();
      this.lastError = null;

      const sync = {
        added: remoteTools.length,
        updated: 0,
        removed: 0,
        total: remoteTools.length,
      };
      const status = await this.getStatus();
      return createTextResponse(JSON.stringify({ sync, status }, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lastError = message;
      return createErrorResponse('Bridge sync failed', message);
    } finally {
      await this.client.disconnect();
    }
  }

  async disconnectTool(): Promise<ToolResponse> {
    try {
      await this.client.disconnect();
      const status = await this.getStatus();
      return createTextResponse(JSON.stringify(status, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lastError = message;
      return createErrorResponse('Bridge disconnect failed', message);
    }
  }
}
