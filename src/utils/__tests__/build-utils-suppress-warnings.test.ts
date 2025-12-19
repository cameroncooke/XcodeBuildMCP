import { describe, it, expect, beforeEach } from 'vitest';
import { executeXcodeBuildCommand } from '../build-utils.ts';
import { XcodePlatform } from '../../types/common.ts';
import { sessionStore } from '../session-store.ts';
import { createMockExecutor } from '../../test-utils/mock-executors.ts';

describe('executeXcodeBuildCommand - suppressWarnings', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  it('should include warnings when suppressWarnings is false', async () => {
    sessionStore.setDefaults({ suppressWarnings: false });

    const mockExecutor = createMockExecutor({
      success: true,
      output: 'warning: Some warning\nerror: Some error',
      error: '',
      exitCode: 0,
    });

    const result = await executeXcodeBuildCommand(
      {
        projectPath: '/test/project.xcodeproj',
        scheme: 'TestScheme',
        configuration: 'Debug',
      },
      {
        platform: XcodePlatform.macOS,
        logPrefix: 'Test',
      },
      false,
      'build',
      mockExecutor,
    );

    expect(result.content).toBeDefined();
    const textContent = result.content
      ?.filter((c) => c.type === 'text')
      .map((c) => (c as { text: string }).text)
      .join('\n');
    expect(textContent).toContain('⚠️ Warning:');
  });

  it('should suppress warnings when suppressWarnings is true', async () => {
    sessionStore.setDefaults({ suppressWarnings: true });

    const mockExecutor = createMockExecutor({
      success: true,
      output: 'warning: Some warning\nerror: Some error',
      error: '',
      exitCode: 0,
    });

    const result = await executeXcodeBuildCommand(
      {
        projectPath: '/test/project.xcodeproj',
        scheme: 'TestScheme',
        configuration: 'Debug',
      },
      {
        platform: XcodePlatform.macOS,
        logPrefix: 'Test',
      },
      false,
      'build',
      mockExecutor,
    );

    expect(result.content).toBeDefined();
    const textContent = result.content
      ?.filter((c) => c.type === 'text')
      .map((c) => (c as { text: string }).text)
      .join('\n');
    expect(textContent).not.toContain('⚠️ Warning:');
    expect(textContent).toContain('❌ Error:');
  });
});
