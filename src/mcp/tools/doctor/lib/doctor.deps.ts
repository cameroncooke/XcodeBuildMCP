import * as os from 'os';
import type { CommandExecutor } from '../../../../utils/execution/index.ts';
import { loadManifest } from '../../../../core/manifest/load-manifest.ts';
import type { RuntimeToolInfo } from '../../../../utils/tool-registry.ts';
import { getRuntimeRegistration } from '../../../../utils/tool-registry.ts';
import { areAxeToolsAvailable, resolveAxeBinary } from '../../../../utils/axe/index.ts';
import {
  isXcodemakeEnabled,
  isXcodemakeAvailable,
  doesMakefileExist,
} from '../../../../utils/xcodemake/index.ts';

export interface BinaryChecker {
  checkBinaryAvailability(binary: string): Promise<{ available: boolean; version?: string }>;
}

export interface XcodeInfoProvider {
  getXcodeInfo(): Promise<
    | { version: string; path: string; selectedXcode: string; xcrunVersion: string }
    | { error: string }
  >;
}

export interface EnvironmentInfoProvider {
  getEnvironmentVariables(): Record<string, string | undefined>;
  getSystemInfo(): {
    platform: string;
    release: string;
    arch: string;
    cpus: string;
    memory: string;
    hostname: string;
    username: string;
    homedir: string;
    tmpdir: string;
  };
  getNodeInfo(): {
    version: string;
    execPath: string;
    pid: string;
    ppid: string;
    platform: string;
    arch: string;
    cwd: string;
    argv: string;
  };
}

export interface PluginInfoProvider {
  getPluginSystemInfo(): Promise<
    | {
        totalPlugins: number;
        pluginDirectories: number;
        pluginsByDirectory: Record<string, string[]>;
        systemMode: string;
      }
    | { error: string; systemMode: string }
  >;
}

export interface RuntimeInfoProvider {
  getRuntimeToolInfo(): Promise<RuntimeToolInfo | null>;
}

export interface FeatureDetector {
  areAxeToolsAvailable(): boolean;
  isXcodemakeEnabled(): boolean;
  isXcodemakeAvailable(): Promise<boolean>;
  doesMakefileExist(path: string): boolean;
}

export interface DoctorDependencies {
  commandExecutor: CommandExecutor;
  binaryChecker: BinaryChecker;
  xcode: XcodeInfoProvider;
  env: EnvironmentInfoProvider;
  plugins: PluginInfoProvider;
  runtime: RuntimeInfoProvider;
  features: FeatureDetector;
}

export function createDoctorDependencies(executor: CommandExecutor): DoctorDependencies {
  const commandExecutor = executor;
  const binaryChecker: BinaryChecker = {
    async checkBinaryAvailability(binary: string) {
      if (binary === 'axe') {
        const axeBinary = resolveAxeBinary();
        if (!axeBinary) {
          return { available: false };
        }

        let version: string | undefined;
        try {
          const res = await executor([axeBinary.path, '--version'], 'Get AXe Version');
          if (res.success && res.output) {
            version = res.output.trim();
          }
        } catch {
          // ignore
        }

        return {
          available: true,
          version: version ?? 'Available (version info not available)',
        };
      }
      try {
        const which = await executor(['which', binary], 'Check Binary Availability');
        if (!which.success) {
          return { available: false };
        }
      } catch {
        return { available: false };
      }

      let version: string | undefined;
      const versionCommands: Record<string, string> = {
        mise: 'mise --version',
      };

      if (binary in versionCommands) {
        try {
          const res = await executor(versionCommands[binary]!.split(' '), 'Get Binary Version');
          if (res.success && res.output) {
            version = res.output.trim();
          }
        } catch {
          // ignore
        }
      }

      return { available: true, version: version ?? 'Available (version info not available)' };
    },
  };

  const xcode: XcodeInfoProvider = {
    async getXcodeInfo() {
      try {
        const xcodebuild = await executor(['xcodebuild', '-version'], 'Get Xcode Version');
        if (!xcodebuild.success) throw new Error('xcodebuild command failed');
        const version = xcodebuild.output.trim().split('\n').slice(0, 2).join(' - ');

        const pathRes = await executor(['xcode-select', '-p'], 'Get Xcode Path');
        if (!pathRes.success) throw new Error('xcode-select command failed');
        const path = pathRes.output.trim();

        const selected = await executor(['xcrun', '--find', 'xcodebuild'], 'Find Xcodebuild');
        if (!selected.success) throw new Error('xcrun --find command failed');
        const selectedXcode = selected.output.trim();

        const xcrun = await executor(['xcrun', '--version'], 'Get Xcrun Version');
        if (!xcrun.success) throw new Error('xcrun --version command failed');
        const xcrunVersion = xcrun.output.trim();

        return { version, path, selectedXcode, xcrunVersion };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    },
  };

  const env: EnvironmentInfoProvider = {
    getEnvironmentVariables() {
      const relevantVars = [
        'INCREMENTAL_BUILDS_ENABLED',
        'PATH',
        'DEVELOPER_DIR',
        'HOME',
        'USER',
        'TMPDIR',
        'NODE_ENV',
        'SENTRY_DISABLED',
      ];

      const envVars: Record<string, string | undefined> = {};
      for (const varName of relevantVars) {
        envVars[varName] = process.env[varName];
      }

      for (const key of Object.keys(process.env)) {
        if (key.startsWith('XCODEBUILDMCP_')) {
          envVars[key] = process.env[key];
        }
      }

      return envVars;
    },

    getSystemInfo() {
      return {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: `${os.cpus().length} x ${os.cpus()[0]?.model ?? 'Unknown'}`,
        memory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
        hostname: os.hostname(),
        username: os.userInfo().username,
        homedir: os.homedir(),
        tmpdir: os.tmpdir(),
      };
    },

    getNodeInfo() {
      return {
        version: process.version,
        execPath: process.execPath,
        pid: process.pid.toString(),
        ppid: process.ppid.toString(),
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
        argv: process.argv.join(' '),
      };
    },
  };

  const plugins: PluginInfoProvider = {
    async getPluginSystemInfo() {
      try {
        const manifest = loadManifest();
        const pluginsByDirectory: Record<string, string[]> = {};
        let totalPlugins = 0;

        for (const [workflowId, workflow] of manifest.workflows.entries()) {
          const toolNames = workflow.tools
            .map((toolId) => manifest.tools.get(toolId)?.names.mcp)
            .filter((name): name is string => name !== undefined);
          totalPlugins += toolNames.length;
          pluginsByDirectory[workflowId] = toolNames;
        }

        return {
          totalPlugins,
          pluginDirectories: manifest.workflows.size,
          pluginsByDirectory,
          systemMode: 'manifest-based',
        };
      } catch (error) {
        return {
          error: `Failed to load manifest: ${error instanceof Error ? error.message : 'Unknown error'}`,
          systemMode: 'error',
        };
      }
    },
  };

  const runtime: RuntimeInfoProvider = {
    async getRuntimeToolInfo() {
      return getRuntimeRegistration();
    },
  };

  const features: FeatureDetector = {
    areAxeToolsAvailable,
    isXcodemakeEnabled,
    isXcodemakeAvailable,
    doesMakefileExist,
  };

  return { commandExecutor, binaryChecker, xcode, env, plugins, runtime, features };
}

export type { CommandExecutor };

export default {} as const;
