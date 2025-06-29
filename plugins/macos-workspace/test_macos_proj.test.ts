import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import tool from './test_macos_proj.js';

// Mock external dependencies
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

vi.mock('../../src/tools/test-common/index.js', () => ({
  handleTestLogic: vi.fn(),
}));

describe('test_macos_proj plugin (primary implementation)', () => {
  let mockHandleTestLogic: MockedFunction<any>;

  beforeEach(async () => {
    // Import mocked modules
    const testCommon = await import('../../src/tools/test-common/index.js');
    mockHandleTestLogic = testCommon.handleTestLogic as MockedFunction<any>;

    vi.clearAllMocks();
  });

  it('should have the correct plugin structure', () => {
    expect(tool).toHaveProperty('name');
    expect(tool).toHaveProperty('description');
    expect(tool).toHaveProperty('schema');
    expect(tool).toHaveProperty('handler');
  });

  it('should have the correct tool name', () => {
    expect(tool.name).toBe('test_macos_proj');
  });

  it('should have the correct description', () => {
    expect(tool.description).toBe('Runs tests for a macOS project using xcodebuild test and parses xcresult output.');
  });

  it('should have the correct schema structure', () => {
    expect(tool.schema).toHaveProperty('projectPath');
    expect(tool.schema).toHaveProperty('scheme');
    expect(tool.schema).toHaveProperty('configuration');
    expect(tool.schema).toHaveProperty('derivedDataPath');
    expect(tool.schema).toHaveProperty('extraArgs');
    expect(tool.schema).toHaveProperty('preferXcodebuild');
  });

  it('should handle basic project test parameters', async () => {
    mockHandleTestLogic.mockResolvedValue({
      content: [{ type: 'text', text: '✅ macOS Test succeeded for scheme MyApp.' }],
      isError: false,
    });

    const params = {
      projectPath: '/path/to/project.xcodeproj',
      scheme: 'MyApp',
    };

    const result = await tool.handler(params);

    expect(result).toBeDefined();
    expect(mockHandleTestLogic).toHaveBeenCalledWith({
      projectPath: '/path/to/project.xcodeproj',
      scheme: 'MyApp',
      configuration: 'Debug',
      preferXcodebuild: false,
      platform: 'macOS',
    });
  });

  it('should handle all optional parameters', async () => {
    mockHandleTestLogic.mockResolvedValue({
      content: [{ type: 'text', text: '✅ macOS Test succeeded for scheme MyProject.' }],
      isError: false,
    });

    const params = {
      projectPath: '/Users/dev/MyProject/MyProject.xcodeproj',
      scheme: 'MyProject',
      configuration: 'Release',
      derivedDataPath: '/custom/DerivedData',
      extraArgs: ['-test-timeouts-enabled', 'YES'],
      preferXcodebuild: true,
    };

    const result = await tool.handler(params);

    expect(result).toBeDefined();
    expect(mockHandleTestLogic).toHaveBeenCalledWith({
      projectPath: '/Users/dev/MyProject/MyProject.xcodeproj',
      scheme: 'MyProject',
      configuration: 'Release',
      derivedDataPath: '/custom/DerivedData',
      extraArgs: ['-test-timeouts-enabled', 'YES'],
      preferXcodebuild: true,
      platform: 'macOS',
    });
  });

  it('should handle test failures', async () => {
    mockHandleTestLogic.mockResolvedValue({
      content: [{ type: 'text', text: '❌ macOS Test failed for scheme FailingApp.' }],
      isError: true,
    });

    const params = {
      projectPath: '/path/to/failing.xcodeproj',
      scheme: 'FailingApp',
    };

    const result = await tool.handler(params);

    expect(result.isError).toBe(true);
    expect(mockHandleTestLogic).toHaveBeenCalledWith({
      projectPath: '/path/to/failing.xcodeproj',
      scheme: 'FailingApp',
      configuration: 'Debug',
      preferXcodebuild: false,
      platform: 'macOS',
    });
  });
});