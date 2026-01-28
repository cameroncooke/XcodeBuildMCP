/**
 * Tests for xcodebuild validation utilities
 */

import { describe, it, expect } from 'vitest';
import { validateXcodebuildExtraArgs } from '../xcodebuild-validation.ts';

describe('validateXcodebuildExtraArgs', () => {
  describe('valid extraArgs', () => {
    it('should return valid for undefined extraArgs', () => {
      const result = validateXcodebuildExtraArgs(undefined);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for empty extraArgs array', () => {
      const result = validateXcodebuildExtraArgs([]);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for legitimate xcodebuild options', () => {
      const result = validateXcodebuildExtraArgs([
        '-only-testing:MyTests/MyTestClass',
        '-verbose',
        '-dry-run',
      ]);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for result bundle path option', () => {
      const result = validateXcodebuildExtraArgs([
        '-resultBundlePath',
        '/path/to/results.xcresult',
      ]);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for multiple legitimate options', () => {
      const result = validateXcodebuildExtraArgs([
        '-only-testing:MyTests/MyTestClass',
        '-configuration',
        'Debug',
        '-sdk',
        'iphonesimulator',
      ]);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('invalid extraArgs', () => {
    it('should reject -test-arg option', () => {
      const result = validateXcodebuildExtraArgs(['-test-arg', '--snapshot-record']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('-test-arg');
      expect(result.error).toContain('not a recognized xcodebuild argument');
      expect(result.error).toContain('testRunnerEnv');
    });

    it('should reject --test-arg option (double dash)', () => {
      const result = validateXcodebuildExtraArgs(['--test-arg', 'value']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('--test-arg');
    });

    it('should reject -testArg option (camelCase)', () => {
      const result = validateXcodebuildExtraArgs(['-testArg', 'value']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('-testArg');
    });

    it('should reject --testArg option (camelCase with double dash)', () => {
      const result = validateXcodebuildExtraArgs(['--testArg', 'value']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('--testArg');
    });

    it('should reject when invalid option is mixed with valid options', () => {
      const result = validateXcodebuildExtraArgs([
        '-only-testing:MyTests/MyTestClass',
        '-test-arg',
        '--snapshot-record',
        '-verbose',
      ]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('-test-arg');
    });

    it('should provide helpful error message with testRunnerEnv suggestion', () => {
      const result = validateXcodebuildExtraArgs(['-test-arg', 'value']);
      expect(result.error).toContain('testRunnerEnv');
      expect(result.error).toContain('{ "testRunnerEnv": { "MY_VAR": "value" } }');
    });
  });

  describe('edge cases', () => {
    it('should handle array with only invalid option', () => {
      const result = validateXcodebuildExtraArgs(['-test-arg']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('-test-arg');
    });

    it('should detect first invalid option in sequence', () => {
      const result = validateXcodebuildExtraArgs(['-test-arg', '--test-arg', '-testArg']);
      expect(result.isValid).toBe(false);
      // Should return error for first invalid option encountered
      expect(result.error).toBeDefined();
    });

    it('should handle options that look similar but are valid', () => {
      // -test is a valid xcodebuild action, not in our invalid list
      const result = validateXcodebuildExtraArgs(['-test', '-verbose']);
      expect(result.isValid).toBe(true);
    });
  });
});
