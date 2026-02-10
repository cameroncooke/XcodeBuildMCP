import { describe, expect, it } from 'vitest';
import { resolveSimulatorAppPid } from '../debugger/simctl.ts';
import { createMockExecutor } from '../../test-utils/mock-executors.ts';

describe('resolveSimulatorAppPid', () => {
  it('returns PID when bundle id is found', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: '1234 0 io.sentry.MyApp\n',
    });

    const pid = await resolveSimulatorAppPid({
      executor: mockExecutor,
      simulatorId: 'SIM-123',
      bundleId: 'io.sentry.MyApp',
    });

    expect(pid).toBe(1234);
  });

  it('throws when bundle id is missing', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: '999 0 other.app\n',
    });

    await expect(
      resolveSimulatorAppPid({
        executor: mockExecutor,
        simulatorId: 'SIM-123',
        bundleId: 'io.sentry.MyApp',
      }),
    ).rejects.toThrow('No running process found');
  });

  it('throws when PID is missing', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: '- 0 io.sentry.MyApp\n',
    });

    await expect(
      resolveSimulatorAppPid({
        executor: mockExecutor,
        simulatorId: 'SIM-123',
        bundleId: 'io.sentry.MyApp',
      }),
    ).rejects.toThrow('not running');
  });
});
