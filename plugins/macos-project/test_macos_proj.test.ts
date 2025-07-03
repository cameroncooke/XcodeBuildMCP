import { describe, it, expect } from 'vitest';
import tool from './test_macos_proj.ts';
import toolOriginal from '../macos-workspace/test_macos_proj.ts';

describe('test_macos_proj re-export', () => {
  it('should re-export the same plugin object', () => {
    expect(tool).toBe(toolOriginal);
  });
  
  it('should have the correct tool name', () => {
    expect(tool.name).toBe('test_macos_proj');
  });

  it('should have the correct plugin structure via re-export', () => {
    expect(tool).toHaveProperty('name');
    expect(tool).toHaveProperty('description');
    expect(tool).toHaveProperty('schema');
    expect(tool).toHaveProperty('handler');
  });
});