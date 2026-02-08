import { beforeEach, describe, expect, it } from 'vitest';
import { createMockCommandResponse, createMockExecutor } from '../../test-utils/mock-executors.ts';
import type { CommandExecutor } from '../execution/index.ts';
import { sessionStore } from '../session-store.ts';
import { inferPlatform } from '../infer-platform.ts';
import { XcodePlatform } from '../../types/common.ts';

describe('inferPlatform', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  it('infers iOS from simulator name without calling external commands', async () => {
    const executor = createMockExecutor(new Error('Executor should not be called'));
    const result = await inferPlatform({ simulatorName: 'iPhone 16 Pro' }, executor);

    expect(result.platform).toBe(XcodePlatform.iOSSimulator);
    expect(result.source).toBe('simulator-name');
  });

  it('reads simulatorName from session defaults', async () => {
    sessionStore.setDefaults({ simulatorName: 'Apple Watch Ultra 2' });

    const executor = createMockExecutor(new Error('Executor should not be called'));
    const result = await inferPlatform({}, executor);

    expect(result.platform).toBe(XcodePlatform.watchOSSimulator);
    expect(result.source).toBe('simulator-name');
  });

  it('infers platform from simulator runtime when simulatorId is provided', async () => {
    const mockExecutor: CommandExecutor = async () =>
      createMockCommandResponse({
        success: true,
        output: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.tvOS-18-0': [
              {
                udid: 'SIM-UUID',
                name: 'Apple TV',
                isAvailable: true,
              },
            ],
          },
        }),
      });

    const result = await inferPlatform({ simulatorId: 'SIM-UUID' }, mockExecutor);

    expect(result.platform).toBe(XcodePlatform.tvOSSimulator);
    expect(result.source).toBe('simulator-runtime');
  });

  it('falls back to build settings when simulator runtime cannot be resolved', async () => {
    const callHistory: string[][] = [];
    const mockExecutor: CommandExecutor = async (command) => {
      callHistory.push(command);

      if (command[0] === 'xcrun') {
        return createMockCommandResponse({
          success: true,
          output: JSON.stringify({ devices: {} }),
        });
      }

      return createMockCommandResponse({
        success: true,
        output: 'SDKROOT = watchsimulator\nSUPPORTED_PLATFORMS = watchsimulator watchos',
      });
    };

    const result = await inferPlatform(
      {
        simulatorId: 'SIM-UUID',
        projectPath: '/tmp/Test.xcodeproj',
        scheme: 'WatchScheme',
      },
      mockExecutor,
    );

    expect(result.platform).toBe(XcodePlatform.watchOSSimulator);
    expect(result.source).toBe('build-settings');
    expect(callHistory).toHaveLength(2);
    expect(callHistory[0]).toEqual(['xcrun', 'simctl', 'list', 'devices', 'available', '--json']);
    expect(callHistory[1]).toEqual([
      'xcodebuild',
      '-showBuildSettings',
      '-scheme',
      'WatchScheme',
      '-project',
      '/tmp/Test.xcodeproj',
    ]);
  });

  it('defaults to iOS when simulator and build-settings inference both fail', async () => {
    const mockExecutor: CommandExecutor = async (command) => {
      if (command[0] === 'xcrun') {
        return createMockCommandResponse({
          success: false,
          error: 'simctl failed',
        });
      }

      return createMockCommandResponse({
        success: false,
        error: 'xcodebuild failed',
      });
    };

    const result = await inferPlatform(
      {
        simulatorId: 'SIM-UUID',
        workspacePath: '/tmp/Test.xcworkspace',
        scheme: 'UnknownScheme',
      },
      mockExecutor,
    );

    expect(result.platform).toBe(XcodePlatform.iOSSimulator);
    expect(result.source).toBe('default');
  });
});
