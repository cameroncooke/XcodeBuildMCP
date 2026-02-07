import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMcpTestHarness, type McpTestHarness } from '../mcp-test-harness.ts';

let harness: McpTestHarness;

beforeAll(async () => {
  harness = await createMcpTestHarness({
    commandResponses: {
      'swift build': { success: true, output: 'Build complete!' },
      'swift package': { success: true, output: 'Package cleaned' },
      'swift test': { success: true, output: 'Test Suite passed' },
      'swift run': { success: true, output: 'Running...' },
      pgrep: { success: false, output: '' },
    },
  });
}, 30_000);

afterAll(async () => {
  await harness.cleanup();
});

describe('MCP Swift Package Tools (e2e)', () => {
  it('swift_package_clean captures swift package clean command', async () => {
    harness.capturedCommands.length = 0;
    const result = await harness.client.callTool({
      name: 'swift_package_clean',
      arguments: {
        packagePath: '/path/to/package',
      },
    });

    expect(result).toBeDefined();
    const content = 'content' in result ? result.content : [];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);

    const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
    expect(commandStrs.some((c) => c.includes('swift') && c.includes('clean'))).toBe(true);
  });

  it('swift_package_test captures swift test command', async () => {
    harness.capturedCommands.length = 0;
    const result = await harness.client.callTool({
      name: 'swift_package_test',
      arguments: {
        packagePath: '/path/to/package',
      },
    });

    expect(result).toBeDefined();
    const content = 'content' in result ? result.content : [];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);

    const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
    expect(commandStrs.some((c) => c.includes('swift') && c.includes('test'))).toBe(true);
  });

  it('swift_package_run captures swift run command', async () => {
    harness.capturedCommands.length = 0;
    const result = await harness.client.callTool({
      name: 'swift_package_run',
      arguments: {
        packagePath: '/path/to/package',
      },
    });

    expect(result).toBeDefined();
    const content = 'content' in result ? result.content : [];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);

    const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
    expect(commandStrs.some((c) => c.includes('swift') && c.includes('run'))).toBe(true);
  });

  it('swift_package_stop returns content for unknown PID', async () => {
    harness.capturedCommands.length = 0;
    const result = await harness.client.callTool({
      name: 'swift_package_stop',
      arguments: {
        pid: 99999,
      },
    });

    expect(result).toBeDefined();
    const content = 'content' in result ? result.content : [];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);

    const hasText =
      Array.isArray(content) &&
      content.some((c) => 'text' in c && typeof c.text === 'string' && c.text.length > 0);
    expect(hasText).toBe(true);
  });

  it('swift_package_list returns content listing processes', async () => {
    harness.capturedCommands.length = 0;
    const result = await harness.client.callTool({
      name: 'swift_package_list',
      arguments: {},
    });

    expect(result).toBeDefined();
    const content = 'content' in result ? result.content : [];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);

    const hasText =
      Array.isArray(content) &&
      content.some((c) => 'text' in c && typeof c.text === 'string' && c.text.length > 0);
    expect(hasText).toBe(true);
  });
});
