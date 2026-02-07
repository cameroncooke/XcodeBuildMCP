import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMcpTestHarness, type McpTestHarness } from '../mcp-test-harness.ts';
import { isErrorResponse, expectContent } from '../test-helpers.ts';

let harness: McpTestHarness;

beforeAll(async () => {
  harness = await createMcpTestHarness({
    commandResponses: {
      'simctl spawn': { success: true, output: '' },
      'log collect': { success: true, output: 'Log captured' },
      devicectl: { success: true, output: '{}' },
      xcrun: { success: true, output: '' },
    },
  });
}, 30_000);

afterAll(async () => {
  await harness.cleanup();
});

describe('MCP Logging Tools (e2e)', () => {
  it('start_sim_log_cap requires simulatorId and bundleId via session', async () => {
    await harness.client.callTool({
      name: 'session_set_defaults',
      arguments: {
        simulatorId: 'AAAAAAAA-1111-2222-3333-444444444444',
        bundleId: 'com.example.TestApp',
      },
    });

    harness.resetCapturedCommands();
    const result = await harness.client.callTool({
      name: 'start_sim_log_cap',
      arguments: {},
    });

    expectContent(result);
  });

  it('stop_sim_log_cap returns error for unknown session', async () => {
    harness.resetCapturedCommands();
    const result = await harness.client.callTool({
      name: 'stop_sim_log_cap',
      arguments: {
        logSessionId: 'nonexistent-session-id',
      },
    });

    expectContent(result);
    expect(isErrorResponse(result)).toBe(true);
  });

  it('start_device_log_cap requires deviceId and bundleId via session', async () => {
    await harness.client.callTool({
      name: 'session_set_defaults',
      arguments: {
        deviceId: 'BBBBBBBB-1111-2222-3333-444444444444',
        bundleId: 'com.example.TestApp',
      },
    });

    harness.resetCapturedCommands();
    const result = await harness.client.callTool({
      name: 'start_device_log_cap',
      arguments: {},
    });

    expectContent(result);
  });

  it('stop_device_log_cap returns error for unknown session', async () => {
    harness.resetCapturedCommands();
    const result = await harness.client.callTool({
      name: 'stop_device_log_cap',
      arguments: {
        logSessionId: 'nonexistent-device-session-id',
      },
    });

    expectContent(result);
    expect(isErrorResponse(result)).toBe(true);
  });
});
