import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import tool from './test_macos_proj.js';

// Mock external dependencies
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
  exec: vi.fn(),
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

vi.mock('../../src/utils/validation.js', () => ({
  createTextResponse: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn()),
}));

describe('test_macos_proj plugin (primary implementation)', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockMkdtemp: MockedFunction<any>;
  let mockRm: MockedFunction<any>;
  let mockStat: MockedFunction<any>;
  let mockPromisify: MockedFunction<any>;
  let mockExec: MockedFunction<any>;

  beforeEach(async () => {
    // Import mocked modules
    const buildUtils = await import('../../src/utils/build-utils.js');
    const fsPromises = await import('fs/promises');
    const util = await import('util');
    const childProcess = await import('child_process');
    
    mockExecuteXcodeBuildCommand = buildUtils.executeXcodeBuildCommand as MockedFunction<any>;
    mockMkdtemp = fsPromises.mkdtemp as MockedFunction<any>;
    mockRm = fsPromises.rm as MockedFunction<any>;
    mockStat = fsPromises.stat as MockedFunction<any>;
    mockPromisify = util.promisify as MockedFunction<any>;
    mockExec = childProcess.exec as MockedFunction<any>;

    // Setup default mock behaviors
    mockMkdtemp.mockResolvedValue('/tmp/test-dir');
    mockRm.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ isFile: () => true });
    
    const mockExecAsync = vi.fn();
    mockExecAsync.mockResolvedValue({ stdout: '{"title":"Test Results","result":"passed"}' });
    mockPromisify.mockReturnValue(mockExecAsync);

    vi.clearAllMocks();
    
    // Re-setup the mocks after clearing
    mockMkdtemp.mockResolvedValue('/tmp/test-dir');
    mockRm.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ isFile: () => true });
    mockPromisify.mockReturnValue(mockExecAsync);
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
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [{ type: 'text', text: '✅ macOS Test succeeded for scheme MyApp.' }],
      isError: false,
    });

    const params = {
      projectPath: '/path/to/project.xcodeproj',
      scheme: 'MyApp',
    };

    const result = await tool.handler(params);

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle all optional parameters', async () => {
    mockExecuteXcodeBuildCommand.mockResolvedValue({
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
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle test failures', async () => {
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [{ type: 'text', text: '❌ macOS Test failed for scheme FailingApp.' }],
      isError: true,
    });

    const params = {
      projectPath: '/path/to/failing.xcodeproj',
      scheme: 'FailingApp',
    };

    const result = await tool.handler(params);

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });
});