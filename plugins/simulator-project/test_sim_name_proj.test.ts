/**
 * test_sim_name_proj Re-export Plugin Test - Test coverage for re-exported test_sim_name_proj tool
 *
 * This test validates that the re-export from simulator-project works correctly.
 */

import { describe, it, expect } from 'vitest';
import testSimNameProjPlugin from './test_sim_name_proj.ts';

describe('test_sim_name_proj re-export plugin tests', () => {
  it('should properly re-export the test_sim_name_proj plugin', () => {
    expect(testSimNameProjPlugin).toBeDefined();
    expect(testSimNameProjPlugin.name).toBe('test_sim_name_proj');
    expect(testSimNameProjPlugin.description).toBe(
      'Runs tests for a project on a simulator by name using xcodebuild test and parses xcresult output.',
    );
    expect(testSimNameProjPlugin.schema).toBeDefined();
    expect(testSimNameProjPlugin.handler).toBeDefined();
    expect(typeof testSimNameProjPlugin.handler).toBe('function');
  });

  it('should have the same structure as the primary plugin', () => {
    // This test ensures the re-export maintains the same interface
    const expectedProperties = ['name', 'description', 'schema', 'handler'];
    expectedProperties.forEach((prop) => {
      expect(testSimNameProjPlugin).toHaveProperty(prop);
    });
  });
});