/**
 * Test: get_sim_app_path_id_proj plugin (primary implementation)
 */

import { describe, it, expect } from 'vitest';
import plugin from './get_sim_app_path_id_proj.js';

describe('get_sim_app_path_id_proj plugin (primary)', () => {
  it('should export correct tool structure', () => {
    expect(plugin).toHaveProperty('name', 'get_sim_app_path_id_proj');
    expect(plugin).toHaveProperty('description');
    expect(plugin).toHaveProperty('schema');
    expect(plugin).toHaveProperty('handler');
    
    expect(typeof plugin.description).toBe('string');
    expect(typeof plugin.schema).toBe('object');
    expect(typeof plugin.handler).toBe('function');
  });

  it('should have required schema properties', () => {
    expect(plugin.schema).toHaveProperty('projectPath');
    expect(plugin.schema).toHaveProperty('scheme');
    expect(plugin.schema).toHaveProperty('platform');
    expect(plugin.schema).toHaveProperty('simulatorId');
    expect(plugin.schema).toHaveProperty('configuration');
    expect(plugin.schema).toHaveProperty('useLatestOS');
  });

  it('should include required parameters in description', () => {
    expect(plugin.description).toContain('projectPath');
    expect(plugin.description).toContain('scheme');
    expect(plugin.description).toContain('platform');
    expect(plugin.description).toContain('simulatorId');
  });
});