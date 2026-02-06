import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import { schema, handler, get_mac_bundle_idLogic } from '../get_mac_bundle_id.ts';
import {
  createMockFileSystemExecutor,
  createCommandMatchingMockExecutor,
} from '../../../../test-utils/mock-executors.ts';

describe('get_mac_bundle_id plugin', () => {
  // Helper function to create mock executor for command matching
  const createMockExecutorForCommands = (results: Record<string, string | Error>) => {
    return createCommandMatchingMockExecutor(
      Object.fromEntries(
        Object.entries(results).map(([command, result]) => [
          command,
          result instanceof Error
            ? { success: false, error: result.message }
            : { success: true, output: result },
        ]),
      ),
    );
  };

  describe('Export Field Validation (Literal)', () => {
    it('should have handler function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const schemaObj = z.object(schema);
      expect(schemaObj.safeParse({ appPath: '/Applications/TextEdit.app' }).success).toBe(true);
      expect(schemaObj.safeParse({ appPath: '/Users/dev/MyApp.app' }).success).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      const schemaObj = z.object(schema);
      expect(schemaObj.safeParse({}).success).toBe(false);
      expect(schemaObj.safeParse({ appPath: 123 }).success).toBe(false);
      expect(schemaObj.safeParse({ appPath: null }).success).toBe(false);
      expect(schemaObj.safeParse({ appPath: undefined }).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    // Note: appPath validation is now handled by Zod schema validation in createTypedTool
    // This test would not reach the logic function as Zod validation occurs before it

    it('should return error when file exists validation fails', async () => {
      const mockExecutor = createMockExecutorForCommands({});
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => false,
      });

      const result = await get_mac_bundle_idLogic(
        { appPath: '/Applications/MyApp.app' },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "File not found: '/Applications/MyApp.app'. Please check the path and try again.",
          },
        ],
        isError: true,
      });
    });

    it('should return success with bundle ID using defaults read', async () => {
      const mockExecutor = createMockExecutorForCommands({
        'defaults read "/Applications/MyApp.app/Contents/Info" CFBundleIdentifier':
          'com.example.MyMacApp',
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await get_mac_bundle_idLogic(
        { appPath: '/Applications/MyApp.app' },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Bundle ID: com.example.MyMacApp',
          },
        ],
        nextSteps: [
          {
            tool: 'launch_mac_app',
            label: 'Launch the app',
            params: { appPath: '/Applications/MyApp.app' },
            priority: 1,
          },
          {
            tool: 'build_macos',
            label: 'Build again',
            params: { scheme: 'SCHEME_NAME' },
            priority: 2,
          },
        ],
        isError: false,
      });
    });

    it('should fallback to PlistBuddy when defaults read fails', async () => {
      const mockExecutor = createMockExecutorForCommands({
        'defaults read "/Applications/MyApp.app/Contents/Info" CFBundleIdentifier': new Error(
          'defaults read failed',
        ),
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/Applications/MyApp.app/Contents/Info.plist"':
          'com.example.MyMacApp',
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await get_mac_bundle_idLogic(
        { appPath: '/Applications/MyApp.app' },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Bundle ID: com.example.MyMacApp',
          },
        ],
        nextSteps: [
          {
            tool: 'launch_mac_app',
            label: 'Launch the app',
            params: { appPath: '/Applications/MyApp.app' },
            priority: 1,
          },
          {
            tool: 'build_macos',
            label: 'Build again',
            params: { scheme: 'SCHEME_NAME' },
            priority: 2,
          },
        ],
        isError: false,
      });
    });

    it('should return error when both extraction methods fail', async () => {
      const mockExecutor = createMockExecutorForCommands({
        'defaults read "/Applications/MyApp.app/Contents/Info" CFBundleIdentifier': new Error(
          'Command failed',
        ),
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/Applications/MyApp.app/Contents/Info.plist"':
          new Error('Command failed'),
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await get_mac_bundle_idLogic(
        { appPath: '/Applications/MyApp.app' },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error extracting macOS bundle ID');
      expect(result.content[0].text).toContain('Could not extract bundle ID from Info.plist');
      expect(result.content[0].text).toContain('Command failed');
      expect(result.content[1].type).toBe('text');
      expect(result.content[1].text).toBe(
        'Make sure the path points to a valid macOS app bundle (.app directory).',
      );
    });

    it('should handle Error objects in catch blocks', async () => {
      const mockExecutor = createMockExecutorForCommands({
        'defaults read "/Applications/MyApp.app/Contents/Info" CFBundleIdentifier': new Error(
          'Custom error message',
        ),
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/Applications/MyApp.app/Contents/Info.plist"':
          new Error('Custom error message'),
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await get_mac_bundle_idLogic(
        { appPath: '/Applications/MyApp.app' },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error extracting macOS bundle ID');
      expect(result.content[0].text).toContain('Could not extract bundle ID from Info.plist');
      expect(result.content[0].text).toContain('Custom error message');
      expect(result.content[1].type).toBe('text');
      expect(result.content[1].text).toBe(
        'Make sure the path points to a valid macOS app bundle (.app directory).',
      );
    });

    it('should handle string errors in catch blocks', async () => {
      const mockExecutor = createMockExecutorForCommands({
        'defaults read "/Applications/MyApp.app/Contents/Info" CFBundleIdentifier': new Error(
          'String error',
        ),
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/Applications/MyApp.app/Contents/Info.plist"':
          new Error('String error'),
      });
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
      });

      const result = await get_mac_bundle_idLogic(
        { appPath: '/Applications/MyApp.app' },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error extracting macOS bundle ID');
      expect(result.content[0].text).toContain('Could not extract bundle ID from Info.plist');
      expect(result.content[0].text).toContain('String error');
      expect(result.content[1].type).toBe('text');
      expect(result.content[1].text).toBe(
        'Make sure the path points to a valid macOS app bundle (.app directory).',
      );
    });
  });
});
