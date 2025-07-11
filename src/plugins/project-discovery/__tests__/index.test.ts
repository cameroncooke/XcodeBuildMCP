/**
 * Tests for project-discovery workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('project-discovery workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
      expect(workflow).toHaveProperty('platforms');
      expect(workflow).toHaveProperty('capabilities');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('Project Discovery');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Discover and examine Xcode projects, workspaces, and Swift packages. Analyze project structure, schemes, build settings, and bundle information.',
      );
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['iOS', 'macOS', 'watchOS', 'tvOS', 'visionOS']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual([
        'project-analysis',
        'scheme-discovery',
        'build-settings',
        'bundle-inspection',
      ]);
    });
  });

  describe('Workflow Validation', () => {
    it('should have valid string properties', () => {
      expect(typeof workflow.name).toBe('string');
      expect(typeof workflow.description).toBe('string');
      expect(workflow.name.length).toBeGreaterThan(0);
      expect(workflow.description.length).toBeGreaterThan(0);
    });

    it('should have valid array properties', () => {
      expect(Array.isArray(workflow.platforms)).toBe(true);
      expect(Array.isArray(workflow.capabilities)).toBe(true);

      expect(workflow.platforms.length).toBeGreaterThan(0);
      expect(workflow.capabilities.length).toBeGreaterThan(0);
    });

    it('should contain expected platform values', () => {
      expect(workflow.platforms).toContain('iOS');
      expect(workflow.platforms).toContain('macOS');
      expect(workflow.platforms).toContain('watchOS');
      expect(workflow.platforms).toContain('tvOS');
      expect(workflow.platforms).toContain('visionOS');
    });

    it('should contain expected capability values', () => {
      expect(workflow.capabilities).toContain('project-analysis');
      expect(workflow.capabilities).toContain('scheme-discovery');
      expect(workflow.capabilities).toContain('build-settings');
      expect(workflow.capabilities).toContain('bundle-inspection');
    });

    it('should not have targets or projectTypes properties', () => {
      expect(workflow).not.toHaveProperty('targets');
      expect(workflow).not.toHaveProperty('projectTypes');
    });
  });
});
