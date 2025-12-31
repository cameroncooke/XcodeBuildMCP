/**
 * Tests for doctor workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('doctor workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('System Doctor');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Debug tools and system doctor for troubleshooting XcodeBuildMCP server, development environment, and tool availability.',
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
