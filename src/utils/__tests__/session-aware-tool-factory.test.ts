import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { createSessionAwareTool } from '../typed-tool-factory.ts';
import { sessionStore } from '../session-store.ts';
import { createMockExecutor } from '../../test-utils/mock-executors.ts';

describe('createSessionAwareTool', () => {
  let tempDir: string;
  let testProjectPath: string;
  let testProjectPath2: string;

  beforeEach(() => {
    sessionStore.clear();
    // Create a temporary directory and test files
    tempDir = mkdtempSync(join(tmpdir(), 'session-aware-tool-test-'));
    testProjectPath = join(tempDir, 'proj.xcodeproj');
    testProjectPath2 = join(tempDir, 'a.xcodeproj');
    writeFileSync(testProjectPath, 'test content');
    writeFileSync(testProjectPath2, 'test content');
  });

  afterEach(() => {
    sessionStore.clear();
    // Clean up temporary directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  const internalSchema = z
    .object({
      scheme: z.string(),
      projectPath: z.string().optional(),
      workspacePath: z.string().optional(),
      simulatorId: z.string().optional(),
      simulatorName: z.string().optional(),
    })
    .refine((v) => !!v.projectPath !== !!v.workspacePath, {
      message: 'projectPath and workspacePath are mutually exclusive',
      path: ['projectPath'],
    })
    .refine((v) => !!v.simulatorId !== !!v.simulatorName, {
      message: 'simulatorId and simulatorName are mutually exclusive',
      path: ['simulatorId'],
    });

  type Params = z.infer<typeof internalSchema>;

  async function logic(_params: Params): Promise<import('../../types/common.ts').ToolResponse> {
    return { content: [{ type: 'text', text: 'OK' }], isError: false };
  }

  const handler = createSessionAwareTool<Params>(internalSchema, logic, () =>
    createMockExecutor({ success: true }),
  );

  it('should merge session defaults and satisfy requirements', async () => {
    sessionStore.setDefaults({
      scheme: 'App',
      projectPath: testProjectPath,
      simulatorId: 'SIM-1',
    });

    const result = await handler({});
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe('OK');
  });

  it('should prefer explicit args over session defaults (same key wins)', async () => {
    // Create a handler that echoes the chosen scheme
    const echoHandler = createSessionAwareTool<Params>(
      internalSchema,
      async (params) => ({
        content: [{ type: 'text', text: params.scheme }],
        isError: false,
      }),
      () => createMockExecutor({ success: true }),
    );

    sessionStore.setDefaults({
      scheme: 'Default',
      projectPath: testProjectPath2,
      simulatorId: 'SIM-A',
    });
    const result = await echoHandler({ scheme: 'FromArgs' });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe('FromArgs');
  });

  it('should return Zod validation error when required field missing', async () => {
    const result = await handler({ projectPath: testProjectPath, simulatorId: 'SIM-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Parameter validation failed');
    expect(result.content[0].text).toContain('scheme');
    expect(result.content[0].text).toContain('session-set-defaults');
  });

  it('should return Zod validation error when neither project nor workspace provided', async () => {
    const result = await handler({ scheme: 'App', simulatorId: 'SIM-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Parameter validation failed');
    expect(result.content[0].text).toContain('projectPath');
    expect(result.content[0].text).toContain('workspacePath');
  });

  it('should surface Zod validation errors with tip when invalid', async () => {
    const badHandler = createSessionAwareTool<any>(internalSchema, logic, () =>
      createMockExecutor({ success: true }),
    );
    const result = await badHandler({ scheme: 123 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Parameter validation failed');
    expect(result.content[0].text).toContain('Tip: set session defaults');
  });

  it('should handle null values without interfering with session defaults', async () => {
    sessionStore.setDefaults({
      scheme: 'App',
      projectPath: testProjectPath,
      simulatorId: 'SIM-1',
    });

    const res = await handler({ workspacePath: null as unknown as string });
    expect(res.isError).toBe(false);
    expect(res.content[0].text).toBe('OK');
  });

  it('should handle undefined values without interfering with session defaults', async () => {
    sessionStore.setDefaults({
      scheme: 'App',
      projectPath: testProjectPath,
      simulatorId: 'SIM-1',
    });

    const res = await handler({ workspacePath: undefined as unknown as string });
    expect(res.isError).toBe(false);
    expect(res.content[0].text).toBe('OK');
  });

  it('should reject mutually exclusive parameters via Zod validation', async () => {
    const res = await handler({
      scheme: 'App',
      projectPath: testProjectPath,
      workspacePath: '/path/b.xcworkspace',
      simulatorId: 'SIM-1',
    });

    expect(res.isError).toBe(true);
    const msg = res.content[0].text;
    expect(msg).toContain('Parameter validation failed');
    expect(msg).toContain('mutually exclusive');
  });
});
