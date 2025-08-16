import * as os from 'os';
import type { CommandExecutor } from '../../../../utils/execution/index.js';
import {
  loadWorkflowGroups,
  loadPlugins,
  getEnabledWorkflows,
} from '../../../../utils/plugin-registry/index.js';
import { areAxeToolsAvailable } from '../../../../utils/axe/index.js';
import {
  isXcodemakeEnabled,
  isXcodemakeAvailable,
  doesMakefileExist,
} from '../../../../utils/xcodemake/index.js';
import { getTrackedToolNames } from '../../../../utils/tool-registry.js';

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
  getRuntimeToolInfo(): Promise<
    | {
        mode: 'dynamic';
        enabledWorkflows: string[];
        enabledTools: string[];
        totalRegistered: number;
      }
    | {
        mode: 'static';
        enabledWorkflows: string[];
        enabledTools: string[];
        totalRegistered: number;
      }
  >;
}

export interface FeatureDetector {
  areAxeToolsAvailable(): boolean;
  isXcodemakeEnabled(): boolean;
  isXcodemakeAvailable(): Promise<boolean>;
  doesMakefileExist(path: string): boolean;
}

export interface DoctorDependencies {
  binaryChecker: BinaryChecker;
  xcode: XcodeInfoProvider;
  env: EnvironmentInfoProvider;
  plugins: PluginInfoProvider;
  runtime: RuntimeInfoProvider;
  features: FeatureDetector;
}

export function createDoctorDependencies(executor: CommandExecutor): DoctorDependencies {
  const binaryChecker: BinaryChecker = {
    async checkBinaryAvailability(binary: string) {
      // If bundled axe is available, reflect that in dependencies even if not on PATH
      if (binary === 'axe' && areAxeToolsAvailable()) {
        return { available: true, version: 'Bundled' };
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
        axe: 'axe --version',
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

      Object.keys(process.env).forEach((key) => {
        if (key.startsWith('XCODEBUILDMCP_')) {
          envVars[key] = process.env[key];
        }
      });

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
        const workflows = await loadWorkflowGroups();
        const pluginsByDirectory: Record<string, string[]> = {};
        let totalPlugins = 0;

        for (const [dirName, wf] of workflows.entries()) {
          const toolNames = wf.tools.map((t) => t.name).filter(Boolean) as string[];
          totalPlugins += toolNames.length;
          pluginsByDirectory[dirName] = toolNames;
        }

        return {
          totalPlugins,
          pluginDirectories: workflows.size,
          pluginsByDirectory,
          systemMode: 'plugin-based',
        };
      } catch (error) {
        return {
          error: `Failed to load plugins: ${error instanceof Error ? error.message : 'Unknown error'}`,
          systemMode: 'error',
        };
      }
    },
  };

  const runtime: RuntimeInfoProvider = {
    async getRuntimeToolInfo() {
      const dynamic = process.env.XCODEBUILDMCP_DYNAMIC_TOOLS === 'true';

      if (dynamic) {
        const enabledWf = getEnabledWorkflows();
        const enabledTools = getTrackedToolNames();
        return {
          mode: 'dynamic',
          enabledWorkflows: enabledWf,
          enabledTools,
          totalRegistered: enabledTools.length,
        };
      }

      // Static mode: all tools are registered
      const workflows = await loadWorkflowGroups();
      const enabledWorkflows = Array.from(workflows.keys());
      const plugins = await loadPlugins();
      const enabledTools = Array.from(plugins.keys());
      return {
        mode: 'static',
        enabledWorkflows,
        enabledTools,
        totalRegistered: enabledTools.length,
      };
    },
  };

  const features: FeatureDetector = {
    areAxeToolsAvailable,
    isXcodemakeEnabled,
    isXcodemakeAvailable,
    doesMakefileExist,
  };

  return { binaryChecker, xcode, env, plugins, runtime, features };
}

export type { CommandExecutor };

export default {} as const;
