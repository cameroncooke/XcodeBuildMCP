/**
 * Error Utilities - Type-safe error hierarchy for the application
 *
 * This utility module defines a structured error hierarchy for the application,
 * providing specialized error types for different failure scenarios. Using these
 * typed errors enables more precise error handling, improves debugging, and
 * provides better error messages to users.
 *
 * Responsibilities:
 * - Providing a base error class (XcodeBuildMCPError) for all application errors
 * - Defining specialized error subtypes for different error categories:
 *   - ValidationError: Parameter validation failures
 *   - BuildError: Xcode build process failures
 *   - SystemError: Underlying system/OS issues
 *   - ConfigurationError: Application configuration problems
 *   - SimulatorError: iOS simulator-specific failures
 *
 * The structured hierarchy allows error consumers to handle errors with the
 * appropriate level of specificity using instanceof checks or catch clauses.
 */

/**
 * Custom error types for XcodeBuildMCP
 */

/**
 * Base error class for XcodeBuildMCP errors
 */
export class XcodeBuildMCPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XcodeBuildMCPError';
    // This is necessary for proper inheritance in TypeScript
    Object.setPrototypeOf(this, XcodeBuildMCPError.prototype);
  }
}

/**
 * Error thrown when validation of parameters fails
 */
export class ValidationError extends XcodeBuildMCPError {
  constructor(
    message: string,
    public paramName?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when a build operation fails
 */
export class BuildError extends XcodeBuildMCPError {
  constructor(
    message: string,
    public buildOutput?: string,
  ) {
    super(message);
    this.name = 'BuildError';
    Object.setPrototypeOf(this, BuildError.prototype);
  }
}

/**
 * Error thrown for system-level errors (file access, permissions, etc.)
 */
export class SystemError extends XcodeBuildMCPError {
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'SystemError';
    Object.setPrototypeOf(this, SystemError.prototype);
  }
}

/**
 * Error thrown for configuration issues
 */
export class ConfigurationError extends XcodeBuildMCPError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error thrown for simulator-specific errors
 */
export class SimulatorError extends XcodeBuildMCPError {
  constructor(
    message: string,
    public simulatorName?: string,
    public simulatorId?: string,
  ) {
    super(message);
    this.name = 'SimulatorError';
    Object.setPrototypeOf(this, SimulatorError.prototype);
  }
}
