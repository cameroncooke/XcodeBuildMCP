/**
 * Integration tests for TEST_RUNNER_ environment variable passing
 *
 * These tests verify that testRunnerEnv parameters are correctly processed
 * and passed through the execution chain. We focus on testing the core
 * functionality that matters most: environment variable normalization.
 */

import { describe, it, expect } from 'vitest';
import { normalizeTestRunnerEnv } from '../environment.ts';

describe('TEST_RUNNER_ Environment Variable Integration', () => {
  describe('Core normalization functionality', () => {
    it('should normalize environment variables correctly for real scenarios', () => {
      // Test the GitHub issue scenario: USE_DEV_MODE -> TEST_RUNNER_USE_DEV_MODE
      const gitHubIssueScenario = { USE_DEV_MODE: 'YES' };
      const normalized = normalizeTestRunnerEnv(gitHubIssueScenario);

      expect(normalized).toEqual({ TEST_RUNNER_USE_DEV_MODE: 'YES' });
    });

    it('should handle mixed prefixed and unprefixed variables', () => {
      const mixedVars = {
        USE_DEV_MODE: 'YES', // Should be prefixed
        TEST_RUNNER_SKIP_ANIMATIONS: '1', // Already prefixed, preserve
        DEBUG_MODE: 'true', // Should be prefixed
      };

      const normalized = normalizeTestRunnerEnv(mixedVars);

      expect(normalized).toEqual({
        TEST_RUNNER_USE_DEV_MODE: 'YES',
        TEST_RUNNER_SKIP_ANIMATIONS: '1',
        TEST_RUNNER_DEBUG_MODE: 'true',
      });
    });

    it('should filter out null and undefined values', () => {
      const varsWithNulls = {
        VALID_VAR: 'value1',
        NULL_VAR: null as any,
        UNDEFINED_VAR: undefined as any,
        ANOTHER_VALID: 'value2',
      };

      const normalized = normalizeTestRunnerEnv(varsWithNulls);

      expect(normalized).toEqual({
        TEST_RUNNER_VALID_VAR: 'value1',
        TEST_RUNNER_ANOTHER_VALID: 'value2',
      });

      // Ensure null/undefined vars are not present
      expect(normalized).not.toHaveProperty('TEST_RUNNER_NULL_VAR');
      expect(normalized).not.toHaveProperty('TEST_RUNNER_UNDEFINED_VAR');
    });

    it('should handle special characters in keys and values', () => {
      const specialChars = {
        'VAR_WITH-DASH': 'value-with-dash',
        'VAR.WITH.DOTS': 'value/with/slashes',
        VAR_WITH_SPACES: 'value with spaces',
        TEST_RUNNER_PRE_EXISTING: 'already=prefixed=value',
      };

      const normalized = normalizeTestRunnerEnv(specialChars);

      expect(normalized).toEqual({
        'TEST_RUNNER_VAR_WITH-DASH': 'value-with-dash',
        'TEST_RUNNER_VAR.WITH.DOTS': 'value/with/slashes',
        TEST_RUNNER_VAR_WITH_SPACES: 'value with spaces',
        TEST_RUNNER_PRE_EXISTING: 'already=prefixed=value',
      });
    });

    it('should handle empty values correctly', () => {
      const emptyValues = {
        EMPTY_STRING: '',
        NORMAL_VAR: 'normal_value',
      };

      const normalized = normalizeTestRunnerEnv(emptyValues);

      expect(normalized).toEqual({
        TEST_RUNNER_EMPTY_STRING: '',
        TEST_RUNNER_NORMAL_VAR: 'normal_value',
      });
    });

    it('should handle edge case prefix variations', () => {
      const prefixEdgeCases = {
        TEST_RUN: 'not_quite_prefixed', // Should get prefixed
        TEST_RUNNER: 'no_underscore', // Should get prefixed
        TEST_RUNNER_CORRECT: 'already_good', // Should stay as-is
        test_runner_lowercase: 'lowercase', // Should get prefixed (case sensitive)
      };

      const normalized = normalizeTestRunnerEnv(prefixEdgeCases);

      expect(normalized).toEqual({
        TEST_RUNNER_TEST_RUN: 'not_quite_prefixed',
        TEST_RUNNER_TEST_RUNNER: 'no_underscore',
        TEST_RUNNER_CORRECT: 'already_good',
        TEST_RUNNER_test_runner_lowercase: 'lowercase',
      });
    });

    it('should preserve immutability of input object', () => {
      const originalInput = { FOO: 'bar', BAZ: 'qux' };
      const inputCopy = { ...originalInput };

      const normalized = normalizeTestRunnerEnv(originalInput);

      // Original should be unchanged
      expect(originalInput).toEqual(inputCopy);

      // Result should be different
      expect(normalized).not.toEqual(originalInput);
      expect(normalized).toEqual({
        TEST_RUNNER_FOO: 'bar',
        TEST_RUNNER_BAZ: 'qux',
      });
    });

    it('should handle the complete test environment workflow', () => {
      // Simulate a comprehensive test environment setup
      const fullTestEnv = {
        // Core testing flags
        USE_DEV_MODE: 'YES',
        SKIP_ANIMATIONS: '1',
        FAST_MODE: 'true',

        // Already prefixed variables (user might provide these)
        TEST_RUNNER_TIMEOUT: '30',
        TEST_RUNNER_RETRIES: '3',

        // UI testing specific
        UI_TESTING_MODE: 'enabled',
        SCREENSHOT_MODE: 'disabled',

        // Performance testing
        PERFORMANCE_TESTS: 'false',
        MEMORY_TESTING: 'true',

        // Special values
        EMPTY_VAR: '',
        PATH_VAR: '/usr/local/bin:/usr/bin',
      };

      const normalized = normalizeTestRunnerEnv(fullTestEnv);

      expect(normalized).toEqual({
        TEST_RUNNER_USE_DEV_MODE: 'YES',
        TEST_RUNNER_SKIP_ANIMATIONS: '1',
        TEST_RUNNER_FAST_MODE: 'true',
        TEST_RUNNER_TIMEOUT: '30',
        TEST_RUNNER_RETRIES: '3',
        TEST_RUNNER_UI_TESTING_MODE: 'enabled',
        TEST_RUNNER_SCREENSHOT_MODE: 'disabled',
        TEST_RUNNER_PERFORMANCE_TESTS: 'false',
        TEST_RUNNER_MEMORY_TESTING: 'true',
        TEST_RUNNER_EMPTY_VAR: '',
        TEST_RUNNER_PATH_VAR: '/usr/local/bin:/usr/bin',
      });
    });
  });
});
