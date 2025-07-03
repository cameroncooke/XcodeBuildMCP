/**
 * Tests for build_sim_id_ws Plugin (Re-export)
 *
 * This tests the re-export from simulator-project directory.
 * The re-export should provide the same interface as the primary implementation.
 */

import { describe, it, expect } from 'vitest';
import plugin from './build_sim_id_ws.ts';

describe('build_sim_id_ws Plugin Re-export', () => {
  describe('re-export structure', () => {
    it('should re-export the plugin with all required properties', () => {
      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('description');
      expect(plugin).toHaveProperty('schema');
      expect(plugin).toHaveProperty('handler');
    });

    it('should have correct tool name', () => {
      expect(plugin.name).toBe('build_sim_id_ws');
    });

    it('should have description mentioning UUID and workspace', () => {
      expect(plugin.description).toContain('UUID');
      expect(plugin.description).toContain('workspace');
      expect(plugin.description).toContain('workspacePath');
      expect(plugin.description).toContain('simulatorId');
    });

    it('should have schema with required properties', () => {
      expect(plugin.schema).toHaveProperty('workspacePath');
      expect(plugin.schema).toHaveProperty('scheme');
      expect(plugin.schema).toHaveProperty('simulatorId');
      expect(plugin.schema).toHaveProperty('configuration');
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });
  });
});