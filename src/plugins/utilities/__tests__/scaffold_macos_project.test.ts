/**
 * Vitest test for scaffold_macos_project plugin
 *
 * Tests the plugin structure and exported components for scaffold_macos_project tool.
 *
 * Plugin location: plugins/utilities/scaffold_macos_project.js
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import scaffoldMacosProject from '../scaffold_macos_project.ts';
import { log, ValidationError, TemplateManager } from '../../../utils/index.js';

// Mock all external dependencies
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  cp: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('../../utils/index.js', () => ({
  log: vi.fn(),
  ValidationError: vi.fn().mockImplementation((message) => {
    const error = new Error(message);
    error.name = 'ValidationError';
    return error;
  }),
  TemplateManager: {
    getTemplatePath: vi.fn(),
    cleanup: vi.fn(),
  },
}));

// Import mocked functions
import { existsSync } from 'fs';
import { mkdir, cp, readFile, writeFile, readdir } from 'fs/promises';

const mockLog = vi.mocked(log);
const mockTemplateManager = vi.mocked(TemplateManager);
const mockExistsSync = vi.mocked(existsSync);
const mockMkdir = vi.mocked(mkdir);
const mockCp = vi.mocked(cp);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockReaddir = vi.mocked(readdir);

describe('scaffold_macos_project plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockTemplateManager.getTemplatePath.mockResolvedValue('/tmp/test-templates/macos');
    mockTemplateManager.cleanup.mockResolvedValue();
    mockExistsSync.mockReturnValue(false);
    mockMkdir.mockResolvedValue(undefined);
    mockCp.mockResolvedValue();
    mockReadFile.mockResolvedValue('template content with MyProject placeholder');
    mockWriteFile.mockResolvedValue();
    mockReaddir.mockResolvedValue([
      { name: 'Package.swift', isDirectory: () => false, isFile: () => true } as any,
      { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true } as any,
    ]);
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(scaffoldMacosProject.name).toBe('scaffold_macos_project');
    });

    it('should have correct description field', () => {
      expect(scaffoldMacosProject.description).toBe(
        'Scaffold a new macOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper macOS configuration.',
      );
    });

    it('should have handler as function', () => {
      expect(typeof scaffoldMacosProject.handler).toBe('function');
    });

    it('should have valid schema with required fields', () => {
      const schema = z.object(scaffoldMacosProject.schema);

      // Test valid input
      expect(
        schema.safeParse({
          projectName: 'MyTestApp',
          outputPath: '/path/to/output',
          bundleIdentifier: 'com.test.myapp',
          displayName: 'My Test App',
          marketingVersion: '1.0',
          currentProjectVersion: '1',
          customizeNames: true,
          deploymentTarget: '15.4',
        }).success,
      ).toBe(true);

      // Test minimal valid input
      expect(
        schema.safeParse({
          projectName: 'MyTestApp',
          outputPath: '/path/to/output',
        }).success,
      ).toBe(true);

      // Test invalid input - missing projectName
      expect(
        schema.safeParse({
          outputPath: '/path/to/output',
        }).success,
      ).toBe(false);

      // Test invalid input - missing outputPath
      expect(
        schema.safeParse({
          projectName: 'MyTestApp',
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for customizeNames
      expect(
        schema.safeParse({
          projectName: 'MyTestApp',
          outputPath: '/path/to/output',
          customizeNames: 'true',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success response for valid scaffold macOS project request', async () => {
      const result = await scaffoldMacosProject.handler({
        projectName: 'TestMacApp',
        outputPath: '/tmp/test-projects',
        bundleIdentifier: 'com.test.macapp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                projectPath: '/tmp/test-projects',
                platform: 'macOS',
                message: 'Successfully scaffolded macOS project "TestMacApp" in /tmp/test-projects',
                nextSteps: [
                  'Important: Before working on the project make sure to read the README.md file in the workspace root directory.',
                  'Build for macOS: build_mac_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject"',
                  'Run and run on macOS: build_run_mac_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject"',
                ],
              },
              null,
              2,
            ),
          },
        ],
      });

      expect(mockTemplateManager.getTemplatePath).toHaveBeenCalledWith('macOS');
      expect(mockTemplateManager.cleanup).toHaveBeenCalledWith('/tmp/test-templates/macos');
    });

    it('should return success response with all optional parameters', async () => {
      const result = await scaffoldMacosProject.handler({
        projectName: 'TestMacApp',
        outputPath: '/tmp/test-projects',
        bundleIdentifier: 'com.test.macapp',
        displayName: 'Test Mac App',
        marketingVersion: '2.0',
        currentProjectVersion: '5',
        customizeNames: true,
        deploymentTarget: '14.0',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                projectPath: '/tmp/test-projects',
                platform: 'macOS',
                message: 'Successfully scaffolded macOS project "TestMacApp" in /tmp/test-projects',
                nextSteps: [
                  'Important: Before working on the project make sure to read the README.md file in the workspace root directory.',
                  'Build for macOS: build_mac_ws --workspace-path "/tmp/test-projects/TestMacApp.xcworkspace" --scheme "TestMacApp"',
                  'Run and run on macOS: build_run_mac_ws --workspace-path "/tmp/test-projects/TestMacApp.xcworkspace" --scheme "TestMacApp"',
                ],
              },
              null,
              2,
            ),
          },
        ],
      });
    });

    it('should return success response with customizeNames false', async () => {
      const result = await scaffoldMacosProject.handler({
        projectName: 'TestMacApp',
        outputPath: '/tmp/test-projects',
        customizeNames: false,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                projectPath: '/tmp/test-projects',
                platform: 'macOS',
                message: 'Successfully scaffolded macOS project "TestMacApp" in /tmp/test-projects',
                nextSteps: [
                  'Important: Before working on the project make sure to read the README.md file in the workspace root directory.',
                  'Build for macOS: build_mac_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject"',
                  'Run and run on macOS: build_run_mac_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject"',
                ],
              },
              null,
              2,
            ),
          },
        ],
      });
    });

    it('should return error response for invalid project name', async () => {
      const result = await scaffoldMacosProject.handler({
        projectName: '123InvalidName',
        outputPath: '/tmp/test-projects',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error:
                  'Project name must start with a letter and contain only letters, numbers, and underscores',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      });
    });

    it('should return error response for existing project files', async () => {
      mockExistsSync.mockReturnValue(true);

      const result = await scaffoldMacosProject.handler({
        projectName: 'TestMacApp',
        outputPath: '/tmp/test-projects',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'Xcode project files already exist in /tmp/test-projects',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      });
    });

    it('should return error response for template manager failure', async () => {
      mockTemplateManager.getTemplatePath.mockRejectedValue(new Error('Template not found'));

      const result = await scaffoldMacosProject.handler({
        projectName: 'TestMacApp',
        outputPath: '/tmp/test-projects',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'Failed to get template for macOS: Template not found',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      });
    });

    it('should handle string error from template manager', async () => {
      mockTemplateManager.getTemplatePath.mockRejectedValue('String error occurred');

      const result = await scaffoldMacosProject.handler({
        projectName: 'TestMacApp',
        outputPath: '/tmp/test-projects',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'Failed to get template for macOS: String error occurred',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      });
    });
  });
});
