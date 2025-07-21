/**
 * Vitest test for scaffold_ios_project plugin
 *
 * Tests the plugin structure and iOS scaffold tool functionality
 * including parameter validation, file operations, template processing, and response formatting.
 *
 * Plugin location: plugins/utilities/scaffold_ios_project.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import scaffoldIosProject, { scaffold_ios_projectLogic } from '../scaffold_ios_project.ts';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../utils/index.js';

describe('scaffold_ios_project plugin', () => {
  let mockCommandExecutor: any;
  let mockFileSystemExecutor: any;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Create mock executor that handles curl/unzip commands properly
    mockCommandExecutor = (
      command: string[],
      logPrefix?: string,
      useShell?: boolean,
      env?: Record<string, string>,
    ) => {
      const cmdString = command.join(' ');

      if (cmdString.includes('curl')) {
        // Mock successful download
        return Promise.resolve({
          success: true,
          output: 'Downloaded successfully',
          process: { pid: 123 } as any,
        });
      } else if (cmdString.includes('unzip')) {
        // Mock successful extraction
        return Promise.resolve({
          success: true,
          output: 'Extracted successfully',
          process: { pid: 123 } as any,
        });
      }

      // Default success for other commands
      return Promise.resolve({
        success: true,
        output: 'Command executed successfully',
        process: { pid: 123 } as any,
      });
    };

    mockFileSystemExecutor = createMockFileSystemExecutor({
      existsSync: (path) => {
        // Mock template directories exist but project files don't
        return (
          path.includes('xcodebuild-mcp-template') ||
          path.includes('XcodeBuildMCP-iOS-Template') ||
          path.includes('/template') ||
          path.endsWith('template') ||
          path.includes('extracted') ||
          path.includes('/mock/template/path')
        );
      },
      readFile: async () => 'template content with MyProject placeholder',
      readdir: async () => [
        { name: 'Package.swift', isDirectory: () => false, isFile: () => true } as any,
        { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true } as any,
      ],
      mkdir: async () => {},
      rm: async () => {},
      cp: async () => {},
      writeFile: async () => {},
      stat: async () => ({ isDirectory: () => true }),
    });

    // Store original environment for cleanup
    originalEnv = process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH;
    // Set local template path to avoid download and chdir issues
    process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH = '/mock/template/path';
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH = originalEnv;
    } else {
      delete process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH;
    }
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

  describe('Command Generation Tests', () => {
    it('should generate correct curl command for iOS template download', async () => {
      // Temporarily disable local template to force download
      delete process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH;

      // Track commands executed
      let capturedCommands: string[][] = [];
      const trackingCommandExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        capturedCommands.push(command);
        if (command.join(' ').includes('curl')) {
          return Promise.resolve({
            success: true,
            output: 'Downloaded successfully',
            process: { pid: 123 } as any,
          });
        } else if (command.join(' ').includes('unzip')) {
          return Promise.resolve({
            success: true,
            output: 'Extracted successfully',
            process: { pid: 123 } as any,
          });
        }
        return Promise.resolve({
          success: true,
          output: 'Command executed successfully',
          process: { pid: 123 } as any,
        });
      };

      await scaffold_ios_projectLogic(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
        },
        trackingCommandExecutor,
        mockFileSystemExecutor,
      );

      // Verify curl command was executed
      const curlCommand = capturedCommands.find((cmd) => cmd.includes('curl'));
      expect(curlCommand).toBeDefined();
      expect(curlCommand).toEqual([
        'curl',
        '-L',
        '-f',
        '-o',
        expect.stringMatching(/template\.zip$/),
        expect.stringMatching(
          /https:\/\/github\.com\/cameroncooke\/XcodeBuildMCP-iOS-Template\/releases\/download\/v\d+\.\d+\.\d+\/XcodeBuildMCP-iOS-Template-\d+\.\d+\.\d+\.zip/,
        ),
      ]);

      // Restore environment variable
      process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH = '/mock/template/path';
    });

    it.skip('should generate correct unzip command for iOS template extraction', async () => {
      // Temporarily disable local template to force download
      delete process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH;

      // Create a mock that returns false for local template paths to force download
      const downloadMockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: (path) => {
          // Only return true for extracted template directories, false for local template paths
          return (
            path.includes('xcodebuild-mcp-template') ||
            path.includes('XcodeBuildMCP-iOS-Template') ||
            path.includes('extracted')
          );
        },
        readFile: async () => 'template content with MyProject placeholder',
        readdir: async () => [
          { name: 'Package.swift', isDirectory: () => false, isFile: () => true } as any,
          { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true } as any,
        ],
        mkdir: async () => {},
        rm: async () => {},
        cp: async () => {},
        writeFile: async () => {},
        stat: async () => ({ isDirectory: () => true }),
      });

      // Track commands executed
      let capturedCommands: string[][] = [];
      const trackingCommandExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        capturedCommands.push(command);
        if (command.join(' ').includes('curl')) {
          return Promise.resolve({
            success: true,
            output: 'Downloaded successfully',
            process: { pid: 123 } as any,
          });
        } else if (command.join(' ').includes('unzip')) {
          return Promise.resolve({
            success: true,
            output: 'Extracted successfully',
            process: { pid: 123 } as any,
          });
        }
        return Promise.resolve({
          success: true,
          output: 'Command executed successfully',
          process: { pid: 123 } as any,
        });
      };

      await scaffold_ios_projectLogic(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
        },
        trackingCommandExecutor,
        downloadMockFileSystemExecutor,
      );

      // Verify unzip command was executed
      const unzipCommand = capturedCommands.find((cmd) => cmd.includes('unzip'));
      expect(unzipCommand).toBeDefined();
      expect(unzipCommand).toEqual(['unzip', '-q', expect.stringMatching(/template\.zip$/)]);

      // Restore environment variable
      process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH = '/mock/template/path';
    });

    it('should generate correct commands when using custom template version', async () => {
      // Temporarily disable local template to force download
      delete process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH;

      // Set custom template version
      const originalVersion = process.env.XCODEBUILD_MCP_IOS_TEMPLATE_VERSION;
      process.env.XCODEBUILD_MCP_IOS_TEMPLATE_VERSION = 'v2.0.0';

      // Track commands executed
      let capturedCommands: string[][] = [];
      const trackingCommandExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        capturedCommands.push(command);
        if (command.join(' ').includes('curl')) {
          return Promise.resolve({
            success: true,
            output: 'Downloaded successfully',
            process: { pid: 123 } as any,
          });
        } else if (command.join(' ').includes('unzip')) {
          return Promise.resolve({
            success: true,
            output: 'Extracted successfully',
            process: { pid: 123 } as any,
          });
        }
        return Promise.resolve({
          success: true,
          output: 'Command executed successfully',
          process: { pid: 123 } as any,
        });
      };

      await scaffold_ios_projectLogic(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
        },
        trackingCommandExecutor,
        mockFileSystemExecutor,
      );

      // Verify curl command uses custom version
      const curlCommand = capturedCommands.find((cmd) => cmd.includes('curl'));
      expect(curlCommand).toBeDefined();
      expect(curlCommand).toEqual([
        'curl',
        '-L',
        '-f',
        '-o',
        expect.stringMatching(/template\.zip$/),
        'https://github.com/cameroncooke/XcodeBuildMCP-iOS-Template/releases/download/v2.0.0/XcodeBuildMCP-iOS-Template-2.0.0.zip',
      ]);

      // Restore original version
      if (originalVersion) {
        process.env.XCODEBUILD_MCP_IOS_TEMPLATE_VERSION = originalVersion;
      } else {
        delete process.env.XCODEBUILD_MCP_IOS_TEMPLATE_VERSION;
      }

      // Restore environment variable
      process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH = '/mock/template/path';
    });

    it.skip('should generate correct commands with no command executor passed', async () => {
      // Temporarily disable local template to force download
      delete process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH;

      // Create a mock that returns false for local template paths to force download
      const downloadMockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: (path) => {
          // Only return true for extracted template directories, false for local template paths
          return (
            path.includes('xcodebuild-mcp-template') ||
            path.includes('XcodeBuildMCP-iOS-Template') ||
            path.includes('extracted')
          );
        },
        readFile: async () => 'template content with MyProject placeholder',
        readdir: async () => [
          { name: 'Package.swift', isDirectory: () => false, isFile: () => true } as any,
          { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true } as any,
        ],
        mkdir: async () => {},
        rm: async () => {},
        cp: async () => {},
        writeFile: async () => {},
        stat: async () => ({ isDirectory: () => true }),
      });

      // Track commands executed - using default executor path
      let capturedCommands: string[][] = [];
      const trackingCommandExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        capturedCommands.push(command);
        if (command.join(' ').includes('curl')) {
          return Promise.resolve({
            success: true,
            output: 'Downloaded successfully',
            process: { pid: 123 } as any,
          });
        } else if (command.join(' ').includes('unzip')) {
          return Promise.resolve({
            success: true,
            output: 'Extracted successfully',
            process: { pid: 123 } as any,
          });
        }
        return Promise.resolve({
          success: true,
          output: 'Command executed successfully',
          process: { pid: 123 } as any,
        });
      };

      await scaffold_ios_projectLogic(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
        },
        trackingCommandExecutor,
        downloadMockFileSystemExecutor,
      );

      // Verify both curl and unzip commands were executed in sequence
      expect(capturedCommands.length).toBeGreaterThanOrEqual(2);

      const curlCommand = capturedCommands.find((cmd) => cmd.includes('curl'));
      const unzipCommand = capturedCommands.find((cmd) => cmd.includes('unzip'));

      expect(curlCommand).toBeDefined();
      expect(unzipCommand).toBeDefined();
      expect(curlCommand[0]).toBe('curl');
      expect(unzipCommand[0]).toBe('unzip');

      // Restore environment variable
      process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH = '/mock/template/path';
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success response for valid scaffold iOS project request', async () => {
      const result = await scaffold_ios_projectLogic(
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
      const result = await scaffold_ios_projectLogic(
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
      const result = await scaffold_ios_projectLogic(
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
      const result = await scaffold_ios_projectLogic(
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

      const result = await scaffold_ios_projectLogic(
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
      // Temporarily disable local template to force download
      delete process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH;

      // Mock command executor to fail for curl commands
      const failingMockCommandExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        const cmdString = command.join(' ');

        if (cmdString.includes('curl')) {
          // Mock download failure
          return Promise.resolve({
            success: false,
            output: '',
            error: 'Template download failed',
            process: { pid: 123 } as any,
          });
        }

        // Other commands succeed
        return Promise.resolve({
          success: true,
          output: 'Command executed successfully',
          process: { pid: 123 } as any,
        });
      };

      const result = await scaffold_ios_projectLogic(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
        },
        failingMockCommandExecutor,
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

      // Restore environment variable
      process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH = '/mock/template/path';
    });

    it.skip('should return error response for template extraction failure', async () => {
      // Temporarily disable local template to force download
      delete process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH;

      // Create a mock that returns false for local template paths to force download
      const downloadMockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: (path) => {
          // Only return true for extracted template directories, false for local template paths
          return (
            path.includes('xcodebuild-mcp-template') ||
            path.includes('XcodeBuildMCP-iOS-Template') ||
            path.includes('extracted')
          );
        },
        readFile: async () => 'template content with MyProject placeholder',
        readdir: async () => [
          { name: 'Package.swift', isDirectory: () => false, isFile: () => true } as any,
          { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true } as any,
        ],
        mkdir: async () => {},
        rm: async () => {},
        cp: async () => {},
        writeFile: async () => {},
        stat: async () => ({ isDirectory: () => true }),
      });

      // Mock command executor to fail for unzip commands
      const failingMockCommandExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        const cmdString = command.join(' ');

        if (cmdString.includes('curl')) {
          // Mock download success
          return Promise.resolve({
            success: true,
            output: 'Downloaded successfully',
            process: { pid: 123 } as any,
          });
        } else if (cmdString.includes('unzip')) {
          // Mock extraction failure
          return Promise.resolve({
            success: false,
            output: '',
            error: 'Extraction failed',
            process: { pid: 123 } as any,
          });
        }

        // Other commands succeed
        return Promise.resolve({
          success: true,
          output: 'Command executed successfully',
          process: { pid: 123 } as any,
        });
      };

      const result = await scaffold_ios_projectLogic(
        {
          projectName: 'TestIOSApp',
          outputPath: '/tmp/test-projects',
        },
        failingMockCommandExecutor,
        downloadMockFileSystemExecutor,
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

      // Restore environment variable
      process.env.XCODEBUILDMCP_IOS_TEMPLATE_PATH = '/mock/template/path';
    });
  });
});
