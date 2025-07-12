/**
 * Vitest test for scaffold_ios_project plugin
 *
 * Tests the plugin structure and iOS scaffold tool functionality
 * including parameter validation, file operations, template processing, and response formatting.
 *
 * Plugin location: plugins/utilities/scaffold_ios_project.js
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import scaffoldIosProject from '../scaffold_ios_project.ts';
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

// Note: Internal utilities are allowed to execute normally (integration testing pattern)

// Import mocked functions
import { existsSync } from 'fs';
import { mkdir, cp, readFile, writeFile, readdir } from 'fs/promises';

const mockExistsSync = vi.mocked(existsSync);
const mockMkdir = vi.mocked(mkdir);
const mockCp = vi.mocked(cp);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockReaddir = vi.mocked(readdir);

describe('scaffold_ios_project plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations for external dependencies only
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
      expect(scaffoldIosProject.name).toBe('scaffold_ios_project');
    });

    it('should have correct description field', () => {
      expect(scaffoldIosProject.description).toBe(
        'Scaffold a new iOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper iOS configuration.',
      );
    });

    it('should have handler as function', () => {
      expect(typeof scaffoldIosProject.handler).toBe('function');
    });

    it('should have valid schema with required fields', () => {
      const schema = z.object(scaffoldIosProject.schema);

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
          deploymentTarget: '18.4',
          targetedDeviceFamily: ['iphone', 'ipad'],
          supportedOrientations: ['portrait', 'landscape-left'],
          supportedOrientationsIpad: ['portrait', 'landscape-left', 'landscape-right'],
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

      // Test invalid input - wrong enum value for targetedDeviceFamily
      expect(
        schema.safeParse({
          projectName: 'MyTestApp',
          outputPath: '/path/to/output',
          targetedDeviceFamily: ['invalid-device'],
        }).success,
      ).toBe(false);

      // Test invalid input - wrong enum value for supportedOrientations
      expect(
        schema.safeParse({
          projectName: 'MyTestApp',
          outputPath: '/path/to/output',
          supportedOrientations: ['invalid-orientation'],
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success response for valid scaffold iOS project request', async () => {
      const result = await scaffoldIosProject.handler({
        projectName: 'TestIOSApp',
        outputPath: '/tmp/test-projects',
        bundleIdentifier: 'com.test.iosapp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                projectPath: '/tmp/test-projects',
                platform: 'iOS',
                message: 'Successfully scaffolded iOS project "TestIOSApp" in /tmp/test-projects',
                nextSteps: [
                  'Important: Before working on the project make sure to read the README.md file in the workspace root directory.',
                  'Build for simulator: build_ios_sim_name_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject" --simulator-name "iPhone 16"',
                  'Build and run on simulator: build_run_ios_sim_name_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject" --simulator-name "iPhone 16"',
                ],
              },
              null,
              2,
            ),
          },
        ],
      });

      expect(mockTemplateManager.getTemplatePath).toHaveBeenCalledWith('iOS');
      expect(mockTemplateManager.cleanup).toHaveBeenCalledWith('/tmp/test-templates/ios');
    });

    it('should return success response with all optional parameters', async () => {
      const result = await scaffoldIosProject.handler({
        projectName: 'TestIOSApp',
        outputPath: '/tmp/test-projects',
        bundleIdentifier: 'com.test.iosapp',
        displayName: 'Test iOS App',
        marketingVersion: '2.0',
        currentProjectVersion: '5',
        customizeNames: true,
        deploymentTarget: '17.0',
        targetedDeviceFamily: ['iphone'],
        supportedOrientations: ['portrait'],
        supportedOrientationsIpad: ['portrait', 'landscape-left'],
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                projectPath: '/tmp/test-projects',
                platform: 'iOS',
                message: 'Successfully scaffolded iOS project "TestIOSApp" in /tmp/test-projects',
                nextSteps: [
                  'Important: Before working on the project make sure to read the README.md file in the workspace root directory.',
                  'Build for simulator: build_ios_sim_name_ws --workspace-path "/tmp/test-projects/TestIOSApp.xcworkspace" --scheme "TestIOSApp" --simulator-name "iPhone 16"',
                  'Build and run on simulator: build_run_ios_sim_name_ws --workspace-path "/tmp/test-projects/TestIOSApp.xcworkspace" --scheme "TestIOSApp" --simulator-name "iPhone 16"',
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
      const result = await scaffoldIosProject.handler({
        projectName: 'TestIOSApp',
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
                platform: 'iOS',
                message: 'Successfully scaffolded iOS project "TestIOSApp" in /tmp/test-projects',
                nextSteps: [
                  'Important: Before working on the project make sure to read the README.md file in the workspace root directory.',
                  'Build for simulator: build_ios_sim_name_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject" --simulator-name "iPhone 16"',
                  'Build and run on simulator: build_run_ios_sim_name_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject" --simulator-name "iPhone 16"',
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
      const result = await scaffoldIosProject.handler({
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

      const result = await scaffoldIosProject.handler({
        projectName: 'TestIOSApp',
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

      const result = await scaffoldIosProject.handler({
        projectName: 'TestIOSApp',
        outputPath: '/tmp/test-projects',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'Failed to get template for iOS: Template not found',
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

      const result = await scaffoldIosProject.handler({
        projectName: 'TestIOSApp',
        outputPath: '/tmp/test-projects',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'Failed to get template for iOS: String error occurred',
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
