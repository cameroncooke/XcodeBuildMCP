import { describe, it, expect, vi } from 'vitest';
import { executeXcodeBuildCommand } from '../build-utils.ts';
import { XcodePlatform } from '../../types/common.ts';

describe('executeXcodeBuildCommand - suppressWarnings', () => {
  it('should include warnings when suppressWarnings is false', async () => {
    const mockExecutor = vi.fn().mockResolvedValue({
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
        suppressWarnings: false,
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
    const mockExecutor = vi.fn().mockResolvedValue({
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
        suppressWarnings: true,
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
