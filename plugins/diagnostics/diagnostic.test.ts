/**
 * Plugin Test: diagnostic
 *
 * This test file validates the diagnostic plugin exports.
 * It imports the plugin and verifies that all required components are present and functional.
 */

import { describe, it, expect } from 'vitest';
import diagnostic from './diagnostic.ts';

describe('diagnostic plugin', () => {
  it('should export default plugin structure', () => {
    expect(diagnostic).toBeDefined();
    expect(diagnostic).toHaveProperty('name');
    expect(diagnostic).toHaveProperty('description');
    expect(diagnostic).toHaveProperty('schema');
    expect(diagnostic).toHaveProperty('handler');
  });

  it('should export correct tool name', () => {
    expect(diagnostic.name).toBe('diagnostic');
  });

  it('should export correct description', () => {
    expect(diagnostic.description).toBe(
      'Provides comprehensive information about the MCP server environment, available dependencies, and configuration status.'
    );
  });

  it('should export valid schema', () => {
    expect(diagnostic.schema).toBeDefined();
    expect(typeof diagnostic.schema).toBe('object');
    expect(diagnostic.schema).toHaveProperty('enabled');
  });

  it('should export handler function', () => {
    expect(typeof diagnostic.handler).toBe('function');
    expect(diagnostic.handler.constructor.name).toBe('AsyncFunction');
  });
});