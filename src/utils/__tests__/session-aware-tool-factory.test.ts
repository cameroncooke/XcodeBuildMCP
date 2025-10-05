import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createSessionAwareTool } from '../typed-tool-factory.ts';
import { sessionStore } from '../session-store.ts';
import { createMockExecutor } from '../../test-utils/mock-executors.ts';

describe('createSessionAwareTool', () => {
  beforeEach(() => {
    sessionStore.clear();
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

  const handler = createSessionAwareTool<Params>({
    internalSchema,
    logicFunction: logic,
    getExecutor: () => createMockExecutor({ success: true }),
    requirements: [
      { allOf: ['scheme'], message: 'scheme is required' },
      { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
      { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
    ],
  });

  it('should merge session defaults and satisfy requirements', async () => {
    sessionStore.setDefaults({
      scheme: 'App',
      projectPath: '/path/proj.xcodeproj',
      simulatorId: 'SIM-1',
    });

    const result = await handler({});
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe('OK');
  });

  it('should prefer explicit args over session defaults (same key wins)', async () => {
    // Create a handler that echoes the chosen scheme
    const echoHandler = createSessionAwareTool<Params>({
      internalSchema,
      logicFunction: async (params) => ({
        content: [{ type: 'text', text: params.scheme }],
        isError: false,
      }),
      getExecutor: () => createMockExecutor({ success: true }),
      requirements: [
        { allOf: ['scheme'], message: 'scheme is required' },
        { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
        {
          oneOf: ['simulatorId', 'simulatorName'],
          message: 'Provide simulatorId or simulatorName',
        },
      ],
    });

    sessionStore.setDefaults({
      scheme: 'Default',
      projectPath: '/a.xcodeproj',
      simulatorId: 'SIM-A',
    });
    const result = await echoHandler({ scheme: 'FromArgs' });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe('FromArgs');
  });

  it('should return friendly error when allOf requirement missing', async () => {
    const result = await handler({ projectPath: '/p.xcodeproj', simulatorId: 'SIM-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required session defaults');
    expect(result.content[0].text).toContain('scheme is required');
  });

  it('should return friendly error when oneOf requirement missing', async () => {
    const result = await handler({ scheme: 'App', simulatorId: 'SIM-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required session defaults');
    expect(result.content[0].text).toContain('Provide a project or workspace');
  });

  it('should surface Zod validation errors with tip when invalid', async () => {
    const badHandler = createSessionAwareTool<any>({
      internalSchema,
      logicFunction: logic,
      getExecutor: () => createMockExecutor({ success: true }),
    });
    const result = await badHandler({ scheme: 123 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Parameter validation failed');
    expect(result.content[0].text).toContain('Tip: set session defaults');
  });

  it('exclusivePairs should NOT prune session defaults when user provides null (treat as not provided)', async () => {
    const handlerWithExclusive = createSessionAwareTool<Params>({
      internalSchema,
      logicFunction: logic,
      getExecutor: () => createMockExecutor({ success: true }),
      requirements: [
        { allOf: ['scheme'], message: 'scheme is required' },
        { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
      ],
      exclusivePairs: [['projectPath', 'workspacePath']],
    });

    sessionStore.setDefaults({
      scheme: 'App',
      projectPath: '/path/proj.xcodeproj',
      simulatorId: 'SIM-1',
    });

    const res = await handlerWithExclusive({ workspacePath: null as unknown as string });
    expect(res.isError).toBe(false);
    expect(res.content[0].text).toBe('OK');
  });

  it('exclusivePairs should NOT prune when user provides undefined (key present)', async () => {
    const handlerWithExclusive = createSessionAwareTool<Params>({
      internalSchema,
      logicFunction: logic,
      getExecutor: () => createMockExecutor({ success: true }),
      requirements: [
        { allOf: ['scheme'], message: 'scheme is required' },
        { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
      ],
      exclusivePairs: [['projectPath', 'workspacePath']],
    });

    sessionStore.setDefaults({
      scheme: 'App',
      projectPath: '/path/proj.xcodeproj',
      simulatorId: 'SIM-1',
    });

    const res = await handlerWithExclusive({ workspacePath: undefined as unknown as string });
    expect(res.isError).toBe(false);
    expect(res.content[0].text).toBe('OK');
  });

  it('rejects when multiple explicit args in an exclusive pair are provided (factory-level)', async () => {
    const internalSchemaNoXor = z.object({
      scheme: z.string(),
      projectPath: z.string().optional(),
      workspacePath: z.string().optional(),
    });

    const handlerNoXor = createSessionAwareTool<z.infer<typeof internalSchemaNoXor>>({
      internalSchema: internalSchemaNoXor,
      logicFunction: (async () => ({
        content: [{ type: 'text', text: 'OK' }],
        isError: false,
      })) as any,
      getExecutor: () => createMockExecutor({ success: true }),
      requirements: [{ allOf: ['scheme'], message: 'scheme is required' }],
      exclusivePairs: [['projectPath', 'workspacePath']],
    });

    const res = await handlerNoXor({
      scheme: 'App',
      projectPath: '/path/a.xcodeproj',
      workspacePath: '/path/b.xcworkspace',
    });

    expect(res.isError).toBe(true);
    const msg = res.content[0].text;
    expect(msg).toContain('Parameter validation failed');
    expect(msg).toContain('Mutually exclusive parameters provided');
    expect(msg).toContain('projectPath');
    expect(msg).toContain('workspacePath');
  });
});
