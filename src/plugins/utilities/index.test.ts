/**
 * Tests for utilities workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from './index.ts';

describe('utilities workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
      expect(workflow).toHaveProperty('platforms');
      expect(workflow).toHaveProperty('capabilities');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('Project Utilities');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'General project utilities including project scaffolding, cleaning, and maintenance operations. Create new projects and manage existing project lifecycle.',
      );
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['iOS', 'macOS']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual([
        'project-scaffolding',
        'project-cleaning',
        'project-maintenance',
        'template-generation',
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
    });

    it('should contain expected capability values', () => {
      expect(workflow.capabilities).toContain('project-scaffolding');
      expect(workflow.capabilities).toContain('project-cleaning');
      expect(workflow.capabilities).toContain('project-maintenance');
      expect(workflow.capabilities).toContain('template-generation');
    });

    it('should not have targets or projectTypes properties', () => {
      expect(workflow).not.toHaveProperty('targets');
      expect(workflow).not.toHaveProperty('projectTypes');
    });
  });
});
