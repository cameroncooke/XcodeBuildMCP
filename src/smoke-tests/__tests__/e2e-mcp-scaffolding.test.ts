import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMcpTestHarness, type McpTestHarness } from '../mcp-test-harness.ts';

let harness: McpTestHarness;

beforeAll(async () => {
  harness = await createMcpTestHarness({
    commandResponses: {},
  });
}, 30_000);

afterAll(async () => {
  await harness.cleanup();
});

describe('MCP Project Scaffolding Tools (e2e)', () => {
  it('scaffold_ios_project returns content with valid args', async () => {
    harness.resetCapturedCommands();
    const result = await harness.client.callTool({
      name: 'scaffold_ios_project',
      arguments: {
        projectName: 'TestApp',
        outputPath: '/tmp/test-scaffold-ios',
      },
    });

    expect(result).toBeDefined();
    const content = 'content' in result ? result.content : [];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
  });

  it('scaffold_macos_project returns content with valid args', async () => {
    harness.resetCapturedCommands();
    const result = await harness.client.callTool({
      name: 'scaffold_macos_project',
      arguments: {
        projectName: 'TestMacApp',
        outputPath: '/tmp/test-scaffold-macos',
      },
    });

    expect(result).toBeDefined();
    const content = 'content' in result ? result.content : [];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
  });
});
