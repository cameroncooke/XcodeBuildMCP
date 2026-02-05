/**
 * Xcode IDE State Reader
 *
 * Reads Xcode's UserInterfaceState.xcuserstate file to extract the currently
 * selected scheme and run destination (simulator/device).
 *
 * This enables XcodeBuildMCP to auto-sync with Xcode's IDE selection when
 * running under Xcode's coding agent.
 */

import { log } from './logger.ts';
import { parseXcuserstate } from './nskeyedarchiver-parser.ts';
import type { CommandExecutor } from './execution/index.ts';

export interface XcodeStateResult {
  scheme?: string;
  simulatorId?: string;
  simulatorName?: string;
  error?: string;
}

export interface XcodeStateReaderContext {
  executor: CommandExecutor;
  cwd: string;
  /** Optional pre-configured workspace path to use directly */
  workspacePath?: string;
  /** Optional pre-configured project path to use directly */
  projectPath?: string;
}

/**
 * Finds the UserInterfaceState.xcuserstate file for the workspace/project.
 *
 * Search order:
 * 1. Use configured workspacePath/projectPath if provided
 * 2. Search for .xcworkspace/.xcodeproj in cwd and parent directories
 *
 * For each found project:
 * - .xcworkspace: <workspace>/xcuserdata/<user>.xcuserdatad/UserInterfaceState.xcuserstate
 * - .xcodeproj: <project>/project.xcworkspace/xcuserdata/<user>.xcuserdatad/UserInterfaceState.xcuserstate
 */
export async function findXcodeStateFile(
  ctx: XcodeStateReaderContext,
): Promise<string | undefined> {
  const { executor, cwd, workspacePath, projectPath } = ctx;

  // Get current username
  const userResult = await executor(['whoami'], 'Get username', false);
  if (!userResult.success) {
    log('warning', `[xcode-state] Failed to get username: ${userResult.error}`);
    return undefined;
  }
  const username = userResult.output.trim();

  // If workspacePath or projectPath is configured, use it directly
  if (workspacePath || projectPath) {
    const basePath = workspacePath ?? projectPath;
    const xcuserstatePath = buildXcuserstatePath(basePath!, username);
    const testResult = await executor(
      ['test', '-f', xcuserstatePath],
      'Check xcuserstate exists',
      false,
    );
    if (testResult.success) {
      log('debug', `[xcode-state] Found xcuserstate from config: ${xcuserstatePath}`);
      return xcuserstatePath;
    }
    log('debug', `[xcode-state] Configured path xcuserstate not found: ${xcuserstatePath}`);
  }

  // Search for projects with increased depth (projects can be nested deeper)
  const findResult = await executor(
    [
      'find',
      cwd,
      '-maxdepth',
      '6',
      '(',
      '-name',
      '*.xcworkspace',
      '-o',
      '-name',
      '*.xcodeproj',
      ')',
      '-type',
      'd',
    ],
    'Find Xcode project/workspace',
    false,
  );

  if (!findResult.success || !findResult.output.trim()) {
    log('debug', `[xcode-state] No Xcode project/workspace found in ${cwd}`);
    return undefined;
  }

  const paths = findResult.output.trim().split('\n').filter(Boolean);

  // Filter out nested workspaces inside xcodeproj and sort
  const filteredPaths = paths
    .filter((p) => !p.includes('.xcodeproj/project.xcworkspace'))
    .sort((a, b) => {
      // Prefer .xcworkspace over .xcodeproj
      const aIsWorkspace = a.endsWith('.xcworkspace');
      const bIsWorkspace = b.endsWith('.xcworkspace');
      if (aIsWorkspace && !bIsWorkspace) return -1;
      if (!aIsWorkspace && bIsWorkspace) return 1;
      return 0;
    });

  // Collect all candidate xcuserstate files with their mtimes
  const candidates: Array<{ path: string; mtime: number }> = [];

  for (const projectPath of filteredPaths) {
    const xcuserstatePath = buildXcuserstatePath(projectPath, username);

    // Check if file exists and get mtime
    const statResult = await executor(
      ['stat', '-f', '%m', xcuserstatePath],
      'Get xcuserstate mtime',
      false,
    );

    if (statResult.success) {
      const mtime = parseInt(statResult.output.trim(), 10);
      candidates.push({ path: xcuserstatePath, mtime });
    }
  }

  if (candidates.length === 0) {
    log('debug', `[xcode-state] No xcuserstate file found for user ${username}`);
    return undefined;
  }

  // If multiple candidates, pick the one with the newest mtime (most recently active)
  if (candidates.length > 1) {
    candidates.sort((a, b) => b.mtime - a.mtime);
    log(
      'debug',
      `[xcode-state] Found ${candidates.length} xcuserstate files, using newest: ${candidates[0].path}`,
    );
  }

  log('debug', `[xcode-state] Found xcuserstate: ${candidates[0].path}`);
  return candidates[0].path;
}

/**
 * Builds the path to the xcuserstate file for a given project/workspace path.
 */
function buildXcuserstatePath(projectPath: string, username: string): string {
  if (projectPath.endsWith('.xcworkspace')) {
    return `${projectPath}/xcuserdata/${username}.xcuserdatad/UserInterfaceState.xcuserstate`;
  } else {
    // .xcodeproj - look in embedded workspace
    return `${projectPath}/project.xcworkspace/xcuserdata/${username}.xcuserdatad/UserInterfaceState.xcuserstate`;
  }
}

/**
 * Looks up a simulator name by its UUID.
 */
export async function lookupSimulatorName(
  ctx: XcodeStateReaderContext,
  simulatorId: string,
): Promise<string | undefined> {
  const { executor } = ctx;

  const result = await executor(
    ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
    'List simulators',
    false,
  );

  if (!result.success) {
    log('warning', `[xcode-state] Failed to list simulators: ${result.error}`);
    return undefined;
  }

  try {
    const data = JSON.parse(result.output) as {
      devices: Record<string, Array<{ udid: string; name: string }>>;
    };

    for (const runtime of Object.values(data.devices)) {
      for (const device of runtime) {
        if (device.udid === simulatorId) {
          return device.name;
        }
      }
    }
  } catch (e) {
    log('warning', `[xcode-state] Failed to parse simulator list: ${e}`);
  }

  return undefined;
}

/**
 * Reads Xcode's IDE state and extracts the active scheme and simulator.
 *
 * Uses bplist-parser for robust binary plist parsing of the xcuserstate file,
 * navigating the NSKeyedArchiver object graph to extract:
 * - ActiveScheme -> IDENameString (scheme name)
 * - ActiveRunDestination -> targetDeviceLocation (simulator/device UUID)
 *
 * @param ctx Context with command executor and working directory
 * @returns The extracted Xcode state or an error
 */
export async function readXcodeIdeState(ctx: XcodeStateReaderContext): Promise<XcodeStateResult> {
  try {
    // Find the xcuserstate file
    const xcuserstatePath = await findXcodeStateFile(ctx);
    if (!xcuserstatePath) {
      return { error: 'No Xcode project/workspace found in working directory' };
    }

    // Parse the state file using bplist-parser
    const state = parseXcuserstate(xcuserstatePath);

    const result: XcodeStateResult = {};

    if (state.scheme) {
      result.scheme = state.scheme;
      log('info', `[xcode-state] Detected active scheme: ${state.scheme}`);
    }

    if (state.simulatorId) {
      result.simulatorId = state.simulatorId;

      // Look up the simulator name
      const name = await lookupSimulatorName(ctx, state.simulatorId);
      if (name) {
        result.simulatorName = name;
        log('info', `[xcode-state] Detected active simulator: ${name} (${state.simulatorId})`);
      } else {
        log('info', `[xcode-state] Detected active destination: ${state.simulatorId}`);
      }
    }

    if (!result.scheme && !result.simulatorId) {
      return { error: 'Could not extract active scheme or destination from Xcode state' };
    }

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log('warning', `[xcode-state] Failed to read Xcode IDE state: ${message}`);
    return { error: message };
  }
}
