/**
 * Tests for test_sim plugin (session-aware version)
 * Follows CLAUDE.md guidance: dependency injection, no vi-mocks, literal validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { sessionStore } from '../../../../utils/session-store.ts';
import testSim from '../test_sim.ts';

describe('test_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testSim.name).toBe('test_sim');
    });

    it('should have concise description', () => {
      expect(testSim.description).toBe('Runs tests on an iOS simulator.');
    });

    it('should have handler function', () => {
      expect(typeof testSim.handler).toBe('function');
    });

    it('should expose only non-session fields in public schema', () => {
      const schema = z.object(testSim.schema);

      expect(schema.safeParse({}).success).toBe(true);
      expect(
        schema.safeParse({
          derivedDataPath: '/tmp/derived',
          extraArgs: ['--quiet'],
          preferXcodebuild: true,
          testRunnerEnv: { FOO: 'BAR' },
        }).success,
      ).toBe(true);

      expect(schema.safeParse({ derivedDataPath: 123 }).success).toBe(false);
      expect(schema.safeParse({ extraArgs: ['--ok', 42] }).success).toBe(false);
      expect(schema.safeParse({ preferXcodebuild: 'yes' }).success).toBe(false);
      expect(schema.safeParse({ testRunnerEnv: { FOO: 123 } }).success).toBe(false);

      const schemaKeys = Object.keys(testSim.schema).sort();
      expect(schemaKeys).toEqual(
        ['derivedDataPath', 'extraArgs', 'preferXcodebuild', 'suppressWarnings', 'testRunnerEnv'].sort(),
      );
    });
  });

  describe('Handler Requirements', () => {
    it('should require scheme when not provided', async () => {
      const result = await testSim.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scheme is required');
    });

    it('should require project or workspace when scheme default exists', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme' });

      const result = await testSim.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should require simulator identifier when scheme and project defaults exist', async () => {
      sessionStore.setDefaults({
        scheme: 'MyScheme',
        projectPath: '/path/to/project.xcodeproj',
      });

      const result = await testSim.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide simulatorId or simulatorName');
    });

    it('should error when both simulatorId and simulatorName provided explicitly', async () => {
      sessionStore.setDefaults({
        scheme: 'MyScheme',
        workspacePath: '/path/to/workspace.xcworkspace',
      });

      const result = await testSim.handler({
        simulatorId: 'SIM-UUID',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
      expect(result.content[0].text).toContain('simulatorId');
      expect(result.content[0].text).toContain('simulatorName');
    });
  });
});
