import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';

// CRITICAL: Mock BEFORE imports to ensure proper mock chain
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import testSimIdProj from './test_sim_id_proj.ts';

// Note: Internal utilities are allowed to execute normally (integration testing pattern)

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('test_sim_id_proj plugin', () => {
  let mockSpawn: Record<string, unknown>;
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    mockSpawn = vi.mocked(spawn);
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(testSimIdProj.name).toBe('test_sim_id_proj');
    });

    it('should have correct description field', () => {
      expect(testSimIdProj.description).toBe(
        'Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler as a function', () => {
      expect(typeof testSimIdProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(testSimIdProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid simulatorId
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--arg1', '--arg2'],
          useLatestOS: true,
          preferXcodebuild: true,
        }).success,
      ).toBe(true);

      // Invalid configuration
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 123,
        }).success,
      ).toBe(false);

      // Invalid derivedDataPath
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          derivedDataPath: 123,
        }).success,
      ).toBe(false);

      // Invalid extraArgs
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          extraArgs: 'not-array',
        }).success,
      ).toBe(false);

      // Invalid useLatestOS
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          useLatestOS: 'yes',
        }).success,
      ).toBe(false);

      // Invalid preferXcodebuild
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          preferXcodebuild: 'yes',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation error for missing projectPath', async () => {
      const result = await testSimIdProj.handler({
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation error for missing scheme', async () => {
      const result = await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation error for missing simulatorId', async () => {
      const result = await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should generate correct xcodebuild test command', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test session started');
        mockProcess.stdout.emit('data', 'Testing completed successfully');
        mockProcess.emit('close', 0);
      }, 0);

      const resultPromise = testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
        configuration: 'Release',
      });

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          expect.stringContaining(
            'xcodebuild -project /path/to/project.xcodeproj -scheme MyScheme -configuration Release',
          ),
        ],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
    });

    it('should return exact successful test response', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test session started');
        mockProcess.stdout.emit('data', 'Testing completed successfully');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result.content[0].text).toContain('✅');
      expect(result.content[0].text).toContain('Test Run test succeeded');
      expect(result.isError).toBeFalsy();
    });

    it('should return exact test failure response', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'xcodebuild: error: Scheme NotFound not found');
        mockProcess.emit('close', 65);
      }, 0);

      const result = await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'NotFound',
        simulatorId: 'test-uuid',
      });

      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('xcodebuild: error');
      expect(result.isError).toBe(true);
    });

    it('should handle spawn errors', async () => {
      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn xcodebuild ENOENT'));
      }, 0);

      const result = await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result.content[0].text).toContain('Error during Test Run test');
      expect(result.isError).toBe(true);
    });
  });
});
