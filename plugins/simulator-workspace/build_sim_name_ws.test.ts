/**
 * Test for build_sim_name_ws plugin re-export
 * 
 * Tests the re-exported build_sim_name_ws tool from simulator-project directory
 * This should behave identically to the primary implementation.
 */

import { describe, it, expect } from 'vitest';

// Import the re-exported plugin
import buildSimNameWsTool from './build_sim_name_ws.ts';

describe('build_sim_name_ws plugin re-export', () => {
  it('should re-export the correct tool structure', () => {
    expect(buildSimNameWsTool).toBeDefined();
    expect(buildSimNameWsTool.name).toBe('build_sim_name_ws');
    expect(buildSimNameWsTool.description).toContain('Builds an app from a workspace for a specific simulator by name');
    expect(buildSimNameWsTool.schema).toBeDefined();
    expect(buildSimNameWsTool.handler).toBeDefined();
    expect(typeof buildSimNameWsTool.handler).toBe('function');
  });

  it('should have identical structure to primary implementation', async () => {
    // Import primary implementation for comparison
    const primaryTool = await import('../simulator-workspace/build_sim_name_ws.ts');
    
    expect(buildSimNameWsTool.name).toBe(primaryTool.default.name);
    expect(buildSimNameWsTool.description).toBe(primaryTool.default.description);
    expect(buildSimNameWsTool.schema).toEqual(primaryTool.default.schema);
    expect(buildSimNameWsTool.handler).toBe(primaryTool.default.handler);
  });
});