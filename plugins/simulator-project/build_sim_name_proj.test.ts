import { describe, it, expect, vi, beforeEach } from 'vitest';
import tool from './build_sim_name_proj.ts';
import { executeXcodeBuildCommand } from '../../src/utils/build-utils.ts';

// Mock external dependencies
vi.mock('../../src/utils/build-utils.ts', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

const mockExecuteXcodeBuildCommand = executeXcodeBuildCommand as any;

describe('build_sim_name_proj plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have the correct tool metadata', () => {
    expect(tool.name).toBe('build_sim_name_proj');
    expect(tool.description).toContain('Builds an app from a project file for a specific simulator by name');
    expect(tool.schema).toBeDefined();
    expect(tool.handler).toBeTypeOf('function');
  });

  it('should have required schema properties', () => {
    expect(tool.schema.projectPath).toBeDefined();
    expect(tool.schema.scheme).toBeDefined();
    expect(tool.schema.simulatorName).toBeDefined();
    expect(tool.schema.configuration).toBeDefined();
    expect(tool.schema.derivedDataPath).toBeDefined();
    expect(tool.schema.extraArgs).toBeDefined();
    expect(tool.schema.useLatestOS).toBeDefined();
    expect(tool.schema.preferXcodebuild).toBeDefined();
  });

  it('should validate required parameters', async () => {
    const result = await tool.handler({});

    expect(result.content).toEqual([
      {
        type: 'text',
        text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
      },
    ]);
    expect(result.isError).toBe(true);
  });

  it('should call executeXcodeBuildCommand with correct parameters', async () => {
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [{ type: 'text', text: '✅ iOS Simulator Build build succeeded.' }],
      isError: false,
    });

    const params = {
      projectPath: '/path/to/MyProject.xcodeproj',
      scheme: 'MyScheme',
      simulatorName: 'iPhone 16',
      configuration: 'Debug',
      useLatestOS: true,
      preferXcodebuild: false,
    };

    await tool.handler(params);

    expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
        configuration: 'Debug',
        useLatestOS: true,
        preferXcodebuild: false,
      }),
      expect.objectContaining({
        platform: 'iOS Simulator',
        simulatorName: 'iPhone 16',
        useLatestOS: true,
        logPrefix: 'iOS Simulator Build',
      }),
      false,
      'build',
    );
  });

  it('should return success response when build succeeds', async () => {
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [{ type: 'text', text: '✅ iOS Simulator Build build succeeded.' }],
      isError: false,
    });

    const result = await tool.handler({
      projectPath: '/path/to/MyProject.xcodeproj',
      scheme: 'MyScheme',
      simulatorName: 'iPhone 16',
    });

    expect(result.isError).toBe(false);
    expect(result.content).toEqual([
      { type: 'text', text: '✅ iOS Simulator Build build succeeded.' },
    ]);
  });

  it('should return error response when build fails', async () => {
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [{ type: 'text', text: 'Build failed: compilation error' }],
      isError: true,
    });

    const result = await tool.handler({
      projectPath: '/path/to/MyProject.xcodeproj',
      scheme: 'MyScheme',
      simulatorName: 'iPhone 16',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: 'text', text: 'Build failed: compilation error' },
    ]);
  });
});