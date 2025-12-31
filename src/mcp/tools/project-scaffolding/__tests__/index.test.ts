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
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('Project Scaffolding');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Tools for creating new iOS and macOS projects from templates. Bootstrap new applications with best practices, standard configurations, and modern project structures.',
      );
    });
  });

  describe('Workflow Validation', () => {
    it('should have valid string properties', () => {
      expect(typeof workflow.name).toBe('string');
      expect(typeof workflow.description).toBe('string');
      expect(workflow.name.length).toBeGreaterThan(0);
      expect(workflow.description.length).toBeGreaterThan(0);
    });
  });
});
