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

  it('should not flag source code lines containing "error" or "warning" as diagnostics', async () => {
    sessionStore.setDefaults({ suppressWarnings: false });

    // Swift source lines echoed during compilation that contain "error"/"warning" as substrings
    const buildOutput = [
      '    var authError: Error?',
      '    private(set) var error: WalletError?',
      '    private(set) var lastError: Error?',
      '    var loadError: Error?',
      '    private(set) var error: String?',
      '    var warningCount: Int = 0',
      '    let isWarning: Bool',
      '    fatalError("unexpected state")',
    ].join('\n');

    const mockExecutor = createMockExecutor({
      success: true,
      output: buildOutput,
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
    expect(textContent).not.toContain('❌ Error:');
    expect(textContent).not.toContain('⚠️ Warning:');
  });

  it('should match real xcodebuild diagnostic lines', async () => {
    sessionStore.setDefaults({ suppressWarnings: false });

    const buildOutput = [
      "/path/to/File.swift:42:10: error: cannot find 'foo' in scope",
      "/path/to/File.swift:15:5: warning: unused variable 'bar'",
      'error: build failed',
      'warning: deprecated API usage',
      'ld: warning: directory not found for option',
      'clang: error: linker command failed',
      'xcode-select: error: tool xcodebuild requires Xcode',
      'fatal error: too many errors emitted',
      "/path/to/header.h:1:9: fatal error: 'Header.h' file not found",
    ].join('\n');

    const mockExecutor = createMockExecutor({
      success: true,
      output: buildOutput,
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
    expect(textContent).toContain('❌ Error:');
    expect(textContent).toContain('⚠️ Warning:');
  });
});
