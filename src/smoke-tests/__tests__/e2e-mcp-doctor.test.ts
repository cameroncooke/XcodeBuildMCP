import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMcpTestHarness, type McpTestHarness } from '../mcp-test-harness.ts';

let harness: McpTestHarness;

beforeAll(async () => {
  harness = await createMcpTestHarness({
    commandResponses: {
      xcrun: { success: true, output: '' },
    },
  });
}, 30_000);

afterAll(async () => {
  await harness.cleanup();
});

describe('MCP Doctor Tool (e2e)', () => {
  it('doctor returns diagnostic content', async () => {
    harness.capturedCommands.length = 0;
    const result = await harness.client.callTool({
      name: 'doctor',
      arguments: {},
    });

    expect(result).toBeDefined();
    const content = 'content' in result ? result.content : [];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);

    const hasText =
      Array.isArray(content) &&
      content.some(
        (c) => 'text' in c && typeof c.text === 'string' && c.text.includes('XcodeBuildMCP Doctor'),
      );
    expect(hasText).toBe(true);
  });
});
