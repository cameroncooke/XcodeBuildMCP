/**
 * Vitest test for scaffold_ios_project plugin
 *
 * Tests the plugin structure and iOS scaffold tool functionality
 * including parameter validation, file operations, template processing, and response formatting.
 *
 * Plugin location: plugins/utilities/scaffold_ios_project.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import scaffoldIosProject from '../scaffold_ios_project.ts';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../utils/index.js';

describe('scaffold_ios_project plugin', () => {
  let mockCommandExecutor: any;
  let mockFileSystemExecutor: any;

  beforeEach(() => {
    // Create mock executors
    mockCommandExecutor = createMockExecutor({
      success: true,
      output: 'Command executed successfully',
    });

    mockFileSystemExecutor = createMockFileSystemExecutor({
      existsSync: (path) => {
        // Return true for template directories, false for project files
        return (
          path.includes('xcodebuild-mcp-template') || path.includes('XcodeBuildMCP-iOS-Template')
        );
      },
      readFile: async () => 'template content with MyProject placeholder',
      readdir: async () => [
        { name: 'Package.swift', isDirectory: () => false, isFile: () => true } as any,
        { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true } as any,
      ],
    });
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
      const result = await scaffoldIosProject.handler(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
          bundleIdentifier: 'com.test.iosapp',
        },
        mockCommandExecutor,
        mockFileSystemExecutor,
      );

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

    it('should return success response with all optional parameters', async () => {
      const result = await scaffoldIosProject.handler(
        {
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
        },
        mockCommandExecutor,
        mockFileSystemExecutor,
      );

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
      const result = await scaffoldIosProject.handler(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
          customizeNames: false,
        },
        mockCommandExecutor,
        mockFileSystemExecutor,
      );

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
      const result = await scaffoldIosProject.handler(
        {
          projectName: '123InvalidName',
          outputPath: '/tmp/test-projects',
        },
        mockCommandExecutor,
        mockFileSystemExecutor,
      );

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
      // Update mock to return true for existing files
      mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
        readFile: async () => 'template content with MyProject placeholder',
        readdir: async () => [
          { name: 'Package.swift', isDirectory: () => false, isFile: () => true } as any,
          { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true } as any,
        ],
      });

      const result = await scaffoldIosProject.handler(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
        },
        mockCommandExecutor,
        mockFileSystemExecutor,
      );

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

    it('should return error response for template download failure', async () => {
      // Mock command executor to fail for template download
      mockCommandExecutor = createMockExecutor({
        success: false,
        error: 'Template download failed',
      });

      const result = await scaffoldIosProject.handler(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
        },
        mockCommandExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error:
                  'Failed to get template for iOS: Failed to download template: Template download failed',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      });
    });

    it('should return error response for template extraction failure', async () => {
      // Manual call tracking for multi-step command execution
      let callCount = 0;
      const executorCalls: Array<{ command: string; args: string[] }> = [];

      // Create custom executor stub that succeeds for download but fails for extraction
      const customExecutor = (command: string, args: string[] = []) => {
        executorCalls.push({ command, args });
        callCount++;
        if (callCount === 1) {
          // First call (download) succeeds
          return Promise.resolve({
            success: true,
            output: 'Downloaded successfully',
            error: '',
          });
        } else {
          // Second call (extract) fails
          return Promise.resolve({
            success: false,
            output: '',
            error: 'Extraction failed',
          });
        }
      };

      const result = await scaffoldIosProject.handler(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
        },
        customExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error:
                  'Failed to get template for iOS: Failed to extract template: Extraction failed',
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
