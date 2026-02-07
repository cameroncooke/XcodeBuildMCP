import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMcpTestHarness, type McpTestHarness } from '../mcp-test-harness.ts';
import { getContent } from '../test-helpers.ts';

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
    harness.resetCapturedCommands();
    const result = await harness.client.callTool({
      name: 'doctor',
      arguments: {},
    });

    const content = getContent(result);
    expect(content.length).toBeGreaterThan(0);

    const hasText = content.some(
      (c) => typeof c.text === 'string' && c.text.includes('XcodeBuildMCP Doctor'),
    );
    expect(hasText).toBe(true);
  });
});
