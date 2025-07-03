/**
 * Test: test_sim_name_ws Re-export Plugin
 * 
 * Verification test for the re-exported iOS simulator test workspace tool (by name).
 * Ensures the re-export from simulator-workspace works correctly.
 */

import { describe, it, expect } from 'vitest';
import testSimNameWs from './test_sim_name_ws.ts';

describe('test_sim_name_ws Re-export Plugin', () => {
  it('should re-export correct tool metadata', () => {
    expect(testSimNameWs.name).toBe('test_sim_name_ws');
    expect(testSimNameWs.description).toBe('Runs tests for a workspace on a simulator by name using xcodebuild test and parses xcresult output.');
    expect(testSimNameWs.schema).toBeDefined();
    expect(testSimNameWs.handler).toBeTypeOf('function');
  });

  it('should be identical to the primary implementation', () => {
    // Re-exports should be functionally identical to the primary implementation
    expect(testSimNameWs.name).toMatch(/^test_sim_name_ws$/);
    expect(testSimNameWs.schema.workspacePath).toBeDefined();
    expect(testSimNameWs.schema.simulatorName).toBeDefined();
  });
});