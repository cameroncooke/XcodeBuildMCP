/**
 * Tests for swift-package workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('swift-package workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('Swift Package Manager');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Swift Package Manager operations for building, testing, running, and managing Swift packages and dependencies. Complete SPM workflow support.',
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
