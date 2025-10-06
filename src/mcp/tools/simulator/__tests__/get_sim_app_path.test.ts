/**
 * Tests for get_sim_app_path plugin (session-aware version)
 * Mirrors patterns from other simulator session-aware migrations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChildProcess } from 'child_process';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import getSimAppPath, { get_sim_app_pathLogic } from '../get_sim_app_path.ts';
import type { CommandExecutor } from '../../../../utils/CommandExecutor.ts';

describe('get_sim_app_path tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getSimAppPath.name).toBe('get_sim_app_path');
    });

    it('should have concise description', () => {
      expect(getSimAppPath.description).toBe('Retrieves the built app path for an iOS simulator.');
    });

    it('should have handler function', () => {
      expect(typeof getSimAppPath.handler).toBe('function');
    });

    it('should expose only platform in public schema', () => {
      const schema = z.object(getSimAppPath.schema);

      expect(schema.safeParse({ platform: 'iOS Simulator' }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ platform: 'iOS' }).success).toBe(false);

      const schemaKeys = Object.keys(getSimAppPath.schema).sort();
      expect(schemaKeys).toEqual(['platform']);
    });
  });

  describe('Handler Requirements', () => {
    it('should require scheme when not provided', async () => {
      const result = await getSimAppPath.handler({
        platform: 'iOS Simulator',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scheme is required');
    });

    it('should require project or workspace when scheme default exists', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme' });

      const result = await getSimAppPath.handler({
        platform: 'iOS Simulator',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should require simulator identifier when scheme and project defaults exist', async () => {
      sessionStore.setDefaults({
        scheme: 'MyScheme',
        projectPath: '/path/to/project.xcodeproj',
      });

      const result = await getSimAppPath.handler({
        platform: 'iOS Simulator',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide simulatorId or simulatorName');
    });

    it('should error when both projectPath and workspacePath provided explicitly', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme' });

      const result = await getSimAppPath.handler({
        platform: 'iOS Simulator',
        projectPath: '/path/project.xcodeproj',
        workspacePath: '/path/workspace.xcworkspace',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
      expect(result.content[0].text).toContain('projectPath');
      expect(result.content[0].text).toContain('workspacePath');
    });

    it('should error when both simulatorId and simulatorName provided explicitly', async () => {
      sessionStore.setDefaults({
        scheme: 'MyScheme',
        workspacePath: '/path/to/workspace.xcworkspace',
      });

      const result = await getSimAppPath.handler({
        platform: 'iOS Simulator',
        simulatorId: 'SIM-UUID',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
      expect(result.content[0].text).toContain('simulatorId');
      expect(result.content[0].text).toContain('simulatorName');
    });
  });

  describe('Logic Behavior', () => {
    it('should return app path with simulator name destination', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        opts?: unknown;
      }> = [];

      const trackingExecutor: CommandExecutor = async (
        command,
        logPrefix,
        useShell,
        opts,
      ): Promise<{
        success: boolean;
        output: string;
        process: ChildProcess;
      }> => {
        callHistory.push({ command, logPrefix, useShell, opts });
        return {
          success: true,
          output:
            '    BUILT_PRODUCTS_DIR = /tmp/DerivedData/Build\n    FULL_PRODUCT_NAME = MyApp.app\n',
          process: { pid: 12345 } as unknown as ChildProcess,
        };
      };

      const result = await get_sim_app_pathLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
          useLatestOS: true,
        },
        trackingExecutor,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].logPrefix).toBe('Get App Path');
      expect(callHistory[0].useShell).toBe(true);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-showBuildSettings',
        '-workspace',
        '/path/to/workspace.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16,OS=latest',
      ]);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(
        '✅ App path retrieved successfully: /tmp/DerivedData/Build/MyApp.app',
      );
    });

    it('should surface executor failures when build settings cannot be retrieved', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Failed to run xcodebuild',
      });

      const result = await get_sim_app_pathLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'SIM-UUID',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get app path');
      expect(result.content[0].text).toContain('Failed to run xcodebuild');
    });
  });
});
