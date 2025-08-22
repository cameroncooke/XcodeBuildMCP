/**
 * Unit tests for environment utilities
 */

import { describe, it, expect } from 'vitest';
import { normalizeTestRunnerEnv } from '../environment.ts';

describe('normalizeTestRunnerEnv', () => {
  describe('Basic Functionality', () => {
    it('should add TEST_RUNNER_ prefix to unprefixed keys', () => {
      const input = { FOO: 'value1', BAR: 'value2' };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_FOO: 'value1',
        TEST_RUNNER_BAR: 'value2',
      });
    });

    it('should preserve keys already prefixed with TEST_RUNNER_', () => {
      const input = { TEST_RUNNER_FOO: 'value1', TEST_RUNNER_BAR: 'value2' };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_FOO: 'value1',
        TEST_RUNNER_BAR: 'value2',
      });
    });

    it('should handle mixed prefixed and unprefixed keys', () => {
      const input = {
        FOO: 'value1',
        TEST_RUNNER_BAR: 'value2',
        BAZ: 'value3',
      };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_FOO: 'value1',
        TEST_RUNNER_BAR: 'value2',
        TEST_RUNNER_BAZ: 'value3',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object', () => {
      const result = normalizeTestRunnerEnv({});
      expect(result).toEqual({});
    });

    it('should handle null/undefined values', () => {
      const input = {
        FOO: 'value1',
        BAR: null as any,
        BAZ: undefined as any,
        QUX: 'value4',
      };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_FOO: 'value1',
        TEST_RUNNER_QUX: 'value4',
      });
    });

    it('should handle empty string values', () => {
      const input = { FOO: '', BAR: 'value2' };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_FOO: '',
        TEST_RUNNER_BAR: 'value2',
      });
    });

    it('should handle special characters in keys', () => {
      const input = {
        FOO_BAR: 'value1',
        'FOO-BAR': 'value2',
        'FOO.BAR': 'value3',
      };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_FOO_BAR: 'value1',
        'TEST_RUNNER_FOO-BAR': 'value2',
        'TEST_RUNNER_FOO.BAR': 'value3',
      });
    });

    it('should handle special characters in values', () => {
      const input = {
        FOO: 'value with spaces',
        BAR: 'value/with/slashes',
        BAZ: 'value=with=equals',
      };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_FOO: 'value with spaces',
        TEST_RUNNER_BAR: 'value/with/slashes',
        TEST_RUNNER_BAZ: 'value=with=equals',
      });
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle USE_DEV_MODE scenario from GitHub issue', () => {
      const input = { USE_DEV_MODE: 'YES' };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_USE_DEV_MODE: 'YES',
      });
    });

    it('should handle multiple test configuration variables', () => {
      const input = {
        USE_DEV_MODE: 'YES',
        SKIP_ANIMATIONS: '1',
        DEBUG_MODE: 'true',
        TEST_TIMEOUT: '30',
      };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_USE_DEV_MODE: 'YES',
        TEST_RUNNER_SKIP_ANIMATIONS: '1',
        TEST_RUNNER_DEBUG_MODE: 'true',
        TEST_RUNNER_TEST_TIMEOUT: '30',
      });
    });

    it('should handle user providing pre-prefixed variables', () => {
      const input = {
        TEST_RUNNER_USE_DEV_MODE: 'YES',
        SKIP_ANIMATIONS: '1',
      };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_USE_DEV_MODE: 'YES',
        TEST_RUNNER_SKIP_ANIMATIONS: '1',
      });
    });

    it('should handle boolean-like string values', () => {
      const input = {
        ENABLED: 'true',
        DISABLED: 'false',
        YES_FLAG: 'YES',
        NO_FLAG: 'NO',
      };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_ENABLED: 'true',
        TEST_RUNNER_DISABLED: 'false',
        TEST_RUNNER_YES_FLAG: 'YES',
        TEST_RUNNER_NO_FLAG: 'NO',
      });
    });
  });

  describe('Prefix Handling Edge Cases', () => {
    it('should not double-prefix already prefixed keys', () => {
      const input = { TEST_RUNNER_FOO: 'value1' };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_FOO: 'value1',
      });

      // Ensure no double prefixing occurred
      expect(result).not.toHaveProperty('TEST_RUNNER_TEST_RUNNER_FOO');
    });

    it('should handle partial prefix matches correctly', () => {
      const input = {
        TEST_RUN: 'value1', // Should get prefixed (not TEST_RUNNER_)
        TEST_RUNNER: 'value2', // Should get prefixed (no underscore)
        TEST_RUNNER_FOO: 'value3', // Should not get prefixed
      };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_TEST_RUN: 'value1',
        TEST_RUNNER_TEST_RUNNER: 'value2',
        TEST_RUNNER_FOO: 'value3',
      });
    });

    it('should handle case-sensitive prefix detection', () => {
      const input = {
        test_runner_foo: 'value1', // lowercase - should get prefixed
        Test_Runner_Bar: 'value2', // mixed case - should get prefixed
        TEST_RUNNER_BAZ: 'value3', // correct case - should not get prefixed
      };
      const result = normalizeTestRunnerEnv(input);

      expect(result).toEqual({
        TEST_RUNNER_test_runner_foo: 'value1',
        TEST_RUNNER_Test_Runner_Bar: 'value2',
        TEST_RUNNER_BAZ: 'value3',
      });
    });
  });

  describe('Input Validation', () => {
    it('should handle undefined input gracefully', () => {
      const result = normalizeTestRunnerEnv(undefined as any);
      expect(result).toEqual({});
    });

    it('should handle null input gracefully', () => {
      const result = normalizeTestRunnerEnv(null as any);
      expect(result).toEqual({});
    });

    it('should preserve original object (immutability)', () => {
      const input = { FOO: 'value1', BAR: 'value2' };
      const originalInput = { ...input };
      const result = normalizeTestRunnerEnv(input);

      // Original input should remain unchanged
      expect(input).toEqual(originalInput);

      // Result should be different from input
      expect(result).not.toEqual(input);
    });
  });
});
