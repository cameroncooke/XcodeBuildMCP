/**
 * XcodeBuild Validation Utilities
 *
 * This module provides validation for xcodebuild command parameters,
 * particularly for detecting invalid or unsupported options.
 */

/**
 * List of invalid or commonly misused xcodebuild options.
 * These options are not recognized by xcodebuild and will cause it to fail.
 */
const INVALID_XCODEBUILD_OPTIONS = new Set([
  '-test-arg', // Not a valid xcodebuild option; use testRunnerEnv instead
  '--test-arg',
  '-testArg',
  '--testArg',
]);

/**
 * Validates extraArgs for invalid xcodebuild options.
 *
 * @param extraArgs - Array of extra arguments to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateXcodebuildExtraArgs(extraArgs?: string[]): {
  isValid: boolean;
  error?: string;
} {
  if (!extraArgs || extraArgs.length === 0) {
    return { isValid: true };
  }

  // Check for invalid options
  for (const arg of extraArgs) {
    if (INVALID_XCODEBUILD_OPTIONS.has(arg)) {
      return {
        isValid: false,
        error: `Invalid xcodebuild option: '${arg}'. This is not a recognized xcodebuild argument. 

If you're trying to pass arguments to the test runner, use the 'testRunnerEnv' parameter instead.
Example: { "testRunnerEnv": { "MY_VAR": "value" } }

For more information, see the xcodebuild man page or documentation.`,
      };
    }
  }

  return { isValid: true };
}
