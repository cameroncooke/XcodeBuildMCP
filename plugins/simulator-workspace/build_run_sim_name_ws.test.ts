/**
 * Tests for build_run_sim_name_ws plugin (re-export from simulator-workspace)
 *
 * This test verifies that the re-export from simulator-workspace works correctly.
 * Since this is a re-export, we mainly test that the plugin structure is correct
 * and that it properly delegates to the primary implementation.
 */

import { describe, it, expect } from 'vitest';
import plugin from './build_run_sim_name_ws.ts';
import primaryPlugin from '../simulator-workspace/build_run_sim_name_ws.ts';

describe('build_run_sim_name_ws plugin (re-export)', () => {
  // ✅ Test plugin structure  
  describe('plugin structure', () => {
    it('should have correct plugin structure', () => {
      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('description');
      expect(plugin).toHaveProperty('schema');
      expect(plugin).toHaveProperty('handler');
      expect(plugin.name).toBe('build_run_sim_name_ws');
      expect(typeof plugin.handler).toBe('function');
    });

    it('should re-export the same plugin as the primary implementation', () => {
      expect(plugin).toBe(primaryPlugin);
      expect(plugin.name).toBe(primaryPlugin.name);
      expect(plugin.description).toBe(primaryPlugin.description);
      expect(plugin.schema).toBe(primaryPlugin.schema);
      expect(plugin.handler).toBe(primaryPlugin.handler);
    });
  });
});