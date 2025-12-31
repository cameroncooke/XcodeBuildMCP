/**
 * Tests for macos-project workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('macos-project workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('macOS Development');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Complete macOS development workflow for both .xcodeproj and .xcworkspace files. Build, test, deploy, and manage macOS applications.',
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
