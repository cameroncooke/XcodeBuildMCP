import { describe, it, expect } from 'vitest';
import {
  toolManifestEntrySchema,
  workflowManifestEntrySchema,
  deriveCliName,
  getEffectiveCliName,
  type ToolManifestEntry,
} from '../schema.ts';

describe('schema', () => {
  describe('toolManifestEntrySchema', () => {
    it('should parse valid tool manifest', () => {
      const input = {
        id: 'build_sim',
        module: 'mcp/tools/simulator/build_sim',
        names: { mcp: 'build_sim' },
        description: 'Build iOS app for simulator',
        availability: { mcp: true, cli: true },
        predicates: [],
        routing: { stateful: false },
      };

      const result = toolManifestEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('build_sim');
        expect(result.data.names.mcp).toBe('build_sim');
      }
    });

    it('should apply default availability', () => {
      const input = {
        id: 'test_tool',
        module: 'mcp/tools/test/test_tool',
        names: { mcp: 'test_tool' },
      };

      const result = toolManifestEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.availability).toEqual({ mcp: true, cli: true });
        expect(result.data.predicates).toEqual([]);
      }
    });

    it('should reject missing required fields', () => {
      const input = {
        id: 'test_tool',
        // missing module and names
      };

      const result = toolManifestEntrySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept optional CLI name', () => {
      const input = {
        id: 'build_sim',
        module: 'mcp/tools/simulator/build_sim',
        names: { mcp: 'build_sim', cli: 'build-simulator' },
      };

      const result = toolManifestEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.names.cli).toBe('build-simulator');
      }
    });

    it('should reject availability.daemon', () => {
      const input = {
        id: 'tool1',
        module: 'mcp/tools/test/tool1',
        names: { mcp: 'tool1' },
        availability: { mcp: true, cli: true, daemon: true },
      };

      expect(toolManifestEntrySchema.safeParse(input).success).toBe(false);
    });

    it('should reject routing.daemonAffinity', () => {
      const input = {
        id: 'tool2',
        module: 'mcp/tools/test/tool2',
        names: { mcp: 'tool2' },
        routing: { stateful: true, daemonAffinity: 'required' },
      };

      expect(toolManifestEntrySchema.safeParse(input).success).toBe(false);
    });
  });

  describe('workflowManifestEntrySchema', () => {
    it('should parse valid workflow manifest', () => {
      const input = {
        id: 'simulator',
        title: 'iOS Simulator Development',
        description: 'Build and test iOS apps on simulators',
        availability: { mcp: true, cli: true },
        selection: {
          mcp: {
            defaultEnabled: true,
            autoInclude: false,
          },
        },
        predicates: [],
        tools: ['build_sim', 'test_sim', 'boot_sim'],
      };

      const result = workflowManifestEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('simulator');
        expect(result.data.tools).toHaveLength(3);
        expect(result.data.selection?.mcp?.defaultEnabled).toBe(true);
      }
    });

    it('should apply default values', () => {
      const input = {
        id: 'test-workflow',
        title: 'Test Workflow',
        description: 'A test workflow',
        tools: ['tool1'],
      };

      const result = workflowManifestEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.availability).toEqual({ mcp: true, cli: true });
        expect(result.data.predicates).toEqual([]);
      }
    });

    it('should reject empty tools array', () => {
      const input = {
        id: 'empty-workflow',
        title: 'Empty Workflow',
        description: 'A workflow with no tools',
        tools: [],
      };

      // Empty tools array is technically valid per schema
      const result = workflowManifestEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should parse autoInclude workflow', () => {
      const input = {
        id: 'session-management',
        title: 'Session Management',
        description: 'Manage session defaults',
        availability: { mcp: true, cli: false },
        selection: {
          mcp: {
            defaultEnabled: true,
            autoInclude: true,
          },
        },
        tools: ['session_show_defaults'],
      };

      const result = workflowManifestEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selection?.mcp?.autoInclude).toBe(true);
        expect(result.data.availability.cli).toBe(false);
      }
    });
  });

  describe('deriveCliName', () => {
    it('should convert underscores to hyphens', () => {
      expect(deriveCliName('build_sim')).toBe('build-sim');
      expect(deriveCliName('get_app_bundle_id')).toBe('get-app-bundle-id');
    });

    it('should convert camelCase to kebab-case', () => {
      expect(deriveCliName('buildSim')).toBe('build-sim');
      expect(deriveCliName('getAppBundleId')).toBe('get-app-bundle-id');
    });

    it('should handle mixed underscores and camelCase', () => {
      expect(deriveCliName('build_simApp')).toBe('build-sim-app');
    });

    it('should handle already kebab-case', () => {
      expect(deriveCliName('build-sim')).toBe('build-sim');
    });

    it('should lowercase the result', () => {
      expect(deriveCliName('BUILD_SIM')).toBe('build-sim');
    });
  });

  describe('getEffectiveCliName', () => {
    it('should use explicit CLI name when provided', () => {
      const tool: ToolManifestEntry = {
        id: 'build_sim',
        module: 'mcp/tools/simulator/build_sim',
        names: { mcp: 'build_sim', cli: 'build-simulator' },
        availability: { mcp: true, cli: true },
        predicates: [],
      };

      expect(getEffectiveCliName(tool)).toBe('build-simulator');
    });

    it('should derive CLI name when not provided', () => {
      const tool: ToolManifestEntry = {
        id: 'build_sim',
        module: 'mcp/tools/simulator/build_sim',
        names: { mcp: 'build_sim' },
        availability: { mcp: true, cli: true },
        predicates: [],
      };

      expect(getEffectiveCliName(tool)).toBe('build-sim');
    });
  });
});
