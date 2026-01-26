import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import tool, { cleanLogic } from '../clean.ts';
import {
  createMockExecutor,
  createMockCommandResponse,
} from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('clean (unified) tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  it('exports correct name/description/schema/handler', () => {
    expect(tool.name).toBe('clean');
    expect(tool.description).toBe('Clean build products.');
    expect(typeof tool.handler).toBe('function');

    const schema = z.strictObject(tool.schema);
    expect(schema.safeParse({}).success).toBe(true);
    expect(
      schema.safeParse({
        extraArgs: ['--quiet'],
        platform: 'iOS Simulator',
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ derivedDataPath: '/tmp/Derived' }).success).toBe(false);
    expect(schema.safeParse({ preferXcodebuild: true }).success).toBe(false);
    expect(schema.safeParse({ configuration: 'Debug' }).success).toBe(false);

    const schemaKeys = Object.keys(tool.schema).sort();
    expect(schemaKeys).toEqual(['extraArgs', 'platform'].sort());
  });

  it('handler validation: error when neither projectPath nor workspacePath provided', async () => {
    const result = await (tool as any).handler({});
    expect(result.isError).toBe(true);
    const text = String(result.content?.[0]?.text ?? '');
    expect(text).toContain('Missing required session defaults');
    expect(text).toContain('Provide a project or workspace');
  });

  it('handler validation: error when both projectPath and workspacePath provided', async () => {
    const result = await (tool as any).handler({
      projectPath: '/p.xcodeproj',
      workspacePath: '/w.xcworkspace',
    });
    expect(result.isError).toBe(true);
    const text = String(result.content?.[0]?.text ?? '');
    expect(text).toContain('Mutually exclusive parameters provided');
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
    const text = String(result.content?.[0]?.text ?? '');
    expect(text).toContain('Parameter validation failed');
    expect(text).toContain('scheme is required when workspacePath is provided');
  });

  it('uses iOS platform by default', async () => {
    let capturedCommand: string[] = [];
    const mockExecutor = async (command: string[]) => {
      capturedCommand = command;
      return createMockCommandResponse({ success: true, output: 'clean success' });
    };

    const result = await cleanLogic(
      { projectPath: '/p.xcodeproj', scheme: 'App' } as any,
      mockExecutor,
    );
    expect(result.isError).not.toBe(true);

    // Check that the command contains iOS platform destination
    const commandStr = capturedCommand.join(' ');
    expect(commandStr).toContain('-destination');
    expect(commandStr).toContain('platform=iOS');
  });

  it('accepts custom platform parameter', async () => {
    let capturedCommand: string[] = [];
    const mockExecutor = async (command: string[]) => {
      capturedCommand = command;
      return createMockCommandResponse({ success: true, output: 'clean success' });
    };

    const result = await cleanLogic(
      {
        projectPath: '/p.xcodeproj',
        scheme: 'App',
        platform: 'macOS',
      } as any,
      mockExecutor,
    );
    expect(result.isError).not.toBe(true);

    // Check that the command contains macOS platform destination
    const commandStr = capturedCommand.join(' ');
    expect(commandStr).toContain('-destination');
    expect(commandStr).toContain('platform=macOS');
  });

  it('accepts iOS Simulator platform parameter (maps to iOS for clean)', async () => {
    let capturedCommand: string[] = [];
    const mockExecutor = async (command: string[]) => {
      capturedCommand = command;
      return createMockCommandResponse({ success: true, output: 'clean success' });
    };

    const result = await cleanLogic(
      {
        projectPath: '/p.xcodeproj',
        scheme: 'App',
        platform: 'iOS Simulator',
      } as any,
      mockExecutor,
    );
    expect(result.isError).not.toBe(true);

    // For clean operations, iOS Simulator should be mapped to iOS platform
    const commandStr = capturedCommand.join(' ');
    expect(commandStr).toContain('-destination');
    expect(commandStr).toContain('platform=iOS');
  });

  it('handler validation: rejects invalid platform values', async () => {
    const result = await (tool as any).handler({
      projectPath: '/p.xcodeproj',
      scheme: 'App',
      platform: 'InvalidPlatform',
    });
    expect(result.isError).toBe(true);
    const text = String(result.content?.[0]?.text ?? '');
    expect(text).toContain('Parameter validation failed');
    expect(text).toContain('platform');
  });
});
