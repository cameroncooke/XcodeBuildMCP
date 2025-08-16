import { describe, it, expect } from 'vitest';
import tool, { cleanLogic } from '../clean.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';

describe('clean (unified) tool', () => {
  it('exports correct name/description/schema/handler', () => {
    expect(tool.name).toBe('clean');
    expect(typeof tool.description).toBe('string');
    expect(tool.schema).toBeDefined();
    expect(typeof tool.handler).toBe('function');
  });

  it('handler validation: error when neither projectPath nor workspacePath provided', async () => {
    const result = await (tool as any).handler({});
    expect(result.isError).toBe(true);
    const text = String(result.content?.[1]?.text ?? result.content?.[0]?.text ?? '');
    expect(text).toContain('Invalid parameters');
  });

  it('handler validation: error when both projectPath and workspacePath provided', async () => {
    const result = await (tool as any).handler({
      projectPath: '/p.xcodeproj',
      workspacePath: '/w.xcworkspace',
    });
    expect(result.isError).toBe(true);
    const text = String(result.content?.[1]?.text ?? result.content?.[0]?.text ?? '');
    expect(text).toContain('Invalid parameters');
  });

  it('runs project-path flow via logic', async () => {
    const mock = createMockExecutor({ success: true, output: 'ok' });
    const result = await cleanLogic({ projectPath: '/p.xcodeproj', scheme: 'App' } as any, mock);
    expect(result.isError).not.toBe(true);
  });

  it('runs workspace-path flow via logic', async () => {
    const mock = createMockExecutor({ success: true, output: 'ok' });
    const result = await cleanLogic(
      { workspacePath: '/w.xcworkspace', scheme: 'App' } as any,
      mock,
    );
    expect(result.isError).not.toBe(true);
  });

  it('handler validation: requires scheme when workspacePath is provided', async () => {
    const result = await (tool as any).handler({ workspacePath: '/w.xcworkspace' });
    expect(result.isError).toBe(true);
    const text = String(result.content?.[1]?.text ?? result.content?.[0]?.text ?? '');
    expect(text).toContain('Invalid parameters');
  });
});
