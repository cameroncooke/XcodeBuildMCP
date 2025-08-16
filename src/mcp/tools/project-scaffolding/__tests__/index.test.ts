/**
 * Tests for project-scaffolding workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('project-scaffolding workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
      expect(workflow).toHaveProperty('platforms');
      expect(workflow).toHaveProperty('targets');
      expect(workflow).toHaveProperty('projectTypes');
      expect(workflow).toHaveProperty('capabilities');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('Project Scaffolding');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Tools for creating new iOS and macOS projects from templates. Bootstrap new applications with best practices, standard configurations, and modern project structures.',
      );
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['iOS', 'macOS']);
    });

    it('should have correct targets array', () => {
      expect(workflow.targets).toEqual(['simulator', 'device', 'mac']);
    });

    it('should have correct projectTypes array', () => {
      expect(workflow.projectTypes).toEqual(['project']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual([
        'project-creation',
        'template-generation',
        'project-initialization',
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
      expect(Array.isArray(workflow.targets)).toBe(true);
      expect(Array.isArray(workflow.projectTypes)).toBe(true);
      expect(Array.isArray(workflow.capabilities)).toBe(true);

      expect(workflow.platforms.length).toBeGreaterThan(0);
      expect(workflow.targets.length).toBeGreaterThan(0);
      expect(workflow.projectTypes.length).toBeGreaterThan(0);
      expect(workflow.capabilities.length).toBeGreaterThan(0);
    });

    it('should contain expected platform values', () => {
      expect(workflow.platforms).toContain('iOS');
      expect(workflow.platforms).toContain('macOS');
    });

    it('should contain expected target values', () => {
      expect(workflow.targets).toContain('simulator');
      expect(workflow.targets).toContain('device');
      expect(workflow.targets).toContain('mac');
    });

    it('should contain expected project type values', () => {
      expect(workflow.projectTypes).toContain('project');
    });

    it('should contain expected capability values', () => {
      expect(workflow.capabilities).toContain('project-creation');
      expect(workflow.capabilities).toContain('template-generation');
      expect(workflow.capabilities).toContain('project-initialization');
    });
  });
});
