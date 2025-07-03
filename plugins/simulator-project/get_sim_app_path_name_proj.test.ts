/**
 * Tests for the get_sim_app_path_name_proj plugin (primary implementation)
 */

import { describe, it, expect } from 'vitest';
import plugin from './get_sim_app_path_name_proj.ts';

describe('get_sim_app_path_name_proj plugin (primary)', () => {
  it('should export the correct structure', () => {
    expect(plugin).toHaveProperty('name', 'get_sim_app_path_name_proj');
    expect(plugin).toHaveProperty('description');
    expect(plugin).toHaveProperty('schema');
    expect(plugin).toHaveProperty('handler');
    expect(typeof plugin.handler).toBe('function');
  });

  it('should have the correct schema properties', () => {
    expect(plugin.schema).toHaveProperty('projectPath');
    expect(plugin.schema).toHaveProperty('scheme');
    expect(plugin.schema).toHaveProperty('platform');
    expect(plugin.schema).toHaveProperty('simulatorName');
    expect(plugin.schema).toHaveProperty('configuration');
    expect(plugin.schema).toHaveProperty('useLatestOS');
  });

  it('should have the expected description', () => {
    expect(plugin.description).toContain('Gets the app bundle path for a simulator by name using a project file');
    expect(plugin.description).toContain('projectPath');
    expect(plugin.description).toContain('scheme');
    expect(plugin.description).toContain('platform');
    expect(plugin.description).toContain('simulatorName');
  });
});