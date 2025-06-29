// Re-export test for build_mac_proj
import { describe, it, expect } from 'vitest';
import tool from './build_mac_proj.js';
import toolOriginal from '../macos-workspace/build_mac_proj.js';

describe('build_mac_proj re-export', () => {
  it('should re-export the same plugin object', () => {
    expect(tool).toBe(toolOriginal);
  });
  
  it('should have the correct tool name', () => {
    expect(tool.name).toBe('build_mac_proj');
  });
});