import { XcodePlatform } from '../types/common.ts';
import type { CommandExecutor } from './execution/index.ts';
import { getDefaultCommandExecutor } from './execution/index.ts';
import { log } from './logging/index.ts';
import { detectPlatformFromScheme, type SimulatorPlatform } from './platform-detection.ts';
import { sessionStore, type SessionDefaults } from './session-store.ts';

type PlatformInferenceSource =
  | 'simulator-name'
  | 'simulator-runtime'
  | 'build-settings'
  | 'default';

export interface InferPlatformParams {
  projectPath?: string;
  workspacePath?: string;
  scheme?: string;
  simulatorId?: string;
  simulatorName?: string;
  sessionDefaults?: Partial<SessionDefaults>;
}

export interface InferPlatformResult {
  platform: SimulatorPlatform;
  source: PlatformInferenceSource;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inferPlatformFromSimulatorName(simulatorName: string): SimulatorPlatform | null {
  const name = simulatorName.toLowerCase();

  if (name.includes('watch')) return XcodePlatform.watchOSSimulator;
  if (name.includes('apple tv') || name.includes('tvos')) return XcodePlatform.tvOSSimulator;
  if (
    name.includes('apple vision') ||
    name.includes('vision pro') ||
    name.includes('visionos') ||
    name.includes('xros')
  ) {
    return XcodePlatform.visionOSSimulator;
  }
  if (name.includes('iphone') || name.includes('ipad') || name.includes('ipod')) {
    return XcodePlatform.iOSSimulator;
  }

  return null;
}

function inferPlatformFromRuntime(runtime: string): SimulatorPlatform | null {
  const value = runtime.toLowerCase();

  if (value.includes('simruntime.watchos') || value.startsWith('watchos')) {
    return XcodePlatform.watchOSSimulator;
  }
  if (
    value.includes('simruntime.tvos') ||
    value.includes('simruntime.appletv') ||
    value.startsWith('tvos')
  ) {
    return XcodePlatform.tvOSSimulator;
  }
  if (
    value.includes('simruntime.xros') ||
    value.includes('simruntime.visionos') ||
    value.startsWith('xros') ||
    value.startsWith('visionos')
  ) {
    return XcodePlatform.visionOSSimulator;
  }
  if (value.includes('simruntime.ios') || value.startsWith('ios')) {
    return XcodePlatform.iOSSimulator;
  }

  return null;
}

function resolveSimulatorsFromSession(params: InferPlatformParams): {
  simulatorId?: string;
  simulatorName?: string;
} {
  const defaults = params.sessionDefaults ?? sessionStore.getAll();
  const simulatorId = params.simulatorId ?? defaults.simulatorId;
  const simulatorName = params.simulatorName ?? defaults.simulatorName;
  return { simulatorId, simulatorName };
}

function resolveProjectFromSession(params: InferPlatformParams): {
  projectPath?: string;
  workspacePath?: string;
  scheme?: string;
} {
  const defaults = params.sessionDefaults ?? sessionStore.getAll();
  return {
    projectPath: params.projectPath ?? defaults.projectPath,
    workspacePath: params.workspacePath ?? defaults.workspacePath,
    scheme: params.scheme ?? defaults.scheme,
  };
}

async function inferPlatformFromSimctl(
  simulatorId: string | undefined,
  simulatorName: string | undefined,
  executor: CommandExecutor,
): Promise<SimulatorPlatform | null> {
  if (!simulatorId && !simulatorName) return null;

  const result = await executor(
    ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
    'Infer Simulator Platform',
    true,
  );

  if (!result.success) {
    log('warning', `[Platform Inference] simctl failed: ${result.error ?? 'Unknown error'}`);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.output);
  } catch {
    log('warning', `[Platform Inference] Failed to parse simctl JSON output`);
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || !('devices' in parsed)) {
    log('warning', `[Platform Inference] simctl JSON missing devices`);
    return null;
  }

  const devices = (parsed as { devices: Record<string, unknown[]> }).devices;
  for (const runtime of Object.keys(devices)) {
    const list = devices[runtime];
    if (!Array.isArray(list)) continue;

    for (const device of list) {
      if (!device || typeof device !== 'object') continue;
      const current = device as {
        udid?: unknown;
        name?: unknown;
        isAvailable?: unknown;
      };

      const matchesId = typeof current.udid === 'string' && current.udid === simulatorId;
      const matchesName = typeof current.name === 'string' && current.name === simulatorName;
      if (!matchesId && !matchesName) continue;
      if (typeof current.isAvailable === 'boolean' && !current.isAvailable) continue;

      return inferPlatformFromRuntime(runtime);
    }
  }

  return null;
}

export async function inferPlatform(
  params: InferPlatformParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<InferPlatformResult> {
  const { simulatorId, simulatorName } = resolveSimulatorsFromSession(params);

  if (simulatorName) {
    const inferredFromName = inferPlatformFromSimulatorName(simulatorName);
    if (inferredFromName) {
      return { platform: inferredFromName, source: 'simulator-name' };
    }
  }

  let simulatorIdForLookup = simulatorId;
  let simulatorNameForLookup = simulatorName;
  if (!simulatorIdForLookup && simulatorName && UUID_REGEX.test(simulatorName)) {
    simulatorIdForLookup = simulatorName;
    simulatorNameForLookup = undefined;
  }

  const inferredFromRuntime = await inferPlatformFromSimctl(
    simulatorIdForLookup,
    simulatorNameForLookup,
    executor,
  );
  if (inferredFromRuntime) {
    return { platform: inferredFromRuntime, source: 'simulator-runtime' };
  }

  const { projectPath, workspacePath, scheme } = resolveProjectFromSession(params);
  if (scheme && (projectPath || workspacePath)) {
    const detection = await detectPlatformFromScheme(projectPath, workspacePath, scheme, executor);
    if (detection.platform) {
      return { platform: detection.platform, source: 'build-settings' };
    }
  }

  return { platform: XcodePlatform.iOSSimulator, source: 'default' };
}
