import { execFile } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';
import type { XcodeToolsBridgeClientStatus } from './client.ts';

const execFileAsync = promisify(execFile);

export type XcodeToolsBridgeStatus = {
  workflowEnabled: boolean;
  bridgeAvailable: boolean;
  bridgePath: string | null;
  xcodeRunning: boolean | null;
  connected: boolean;
  bridgePid: number | null;
  proxiedToolCount: number;
  lastError: string | null;
  xcodePid: string | null;
  xcodeSessionId: string | null;
};

export interface BuildXcodeToolsBridgeStatusArgs {
  workflowEnabled: boolean;
  proxiedToolCount: number;
  lastError: string | null;
  clientStatus: XcodeToolsBridgeClientStatus;
}

export async function buildXcodeToolsBridgeStatus(
  args: BuildXcodeToolsBridgeStatusArgs,
): Promise<XcodeToolsBridgeStatus> {
  const bridge = await getMcpBridgeAvailability();
  const xcodeRunning = await isXcodeRunning();

  return {
    workflowEnabled: args.workflowEnabled,
    bridgeAvailable: bridge.available,
    bridgePath: bridge.path,
    xcodeRunning,
    connected: args.clientStatus.connected,
    bridgePid: args.clientStatus.bridgePid,
    proxiedToolCount: args.proxiedToolCount,
    lastError: args.lastError ?? args.clientStatus.lastError,
    xcodePid: process.env.XCODEBUILDMCP_XCODE_PID ?? process.env.MCP_XCODE_PID ?? null,
    xcodeSessionId:
      process.env.XCODEBUILDMCP_XCODE_SESSION_ID ?? process.env.MCP_XCODE_SESSION_ID ?? null,
  };
}

export async function getMcpBridgeAvailability(): Promise<{
  available: boolean;
  path: string | null;
}> {
  try {
    const res = await execFileAsync('xcrun', ['--find', 'mcpbridge'], { timeout: 2000 });
    const out = (res.stdout ?? '').toString().trim();
    return out ? { available: true, path: out } : { available: false, path: null };
  } catch {
    return { available: false, path: null };
  }
}

export async function isXcodeRunning(): Promise<boolean | null> {
  try {
    const res = await execFileAsync('pgrep', ['-x', 'Xcode'], { timeout: 1000 });
    const out = (res.stdout ?? '').toString().trim();
    return out.length > 0;
  } catch {
    return null;
  }
}
