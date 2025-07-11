/**
 * Tests for diagnostics workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('diagnostics workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
      expect(workflow).toHaveProperty('platforms');
      expect(workflow).toHaveProperty('capabilities');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('System Diagnostics');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Debug tools and system diagnostics for troubleshooting XcodeBuildMCP server, development environment, and tool availability.',
      );
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['system']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual([
        'diagnostics',
        'troubleshooting',
        'system-analysis',
        'environment-validation',
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
      expect(workflow.platforms).toContain('system');
    });

    it('should contain expected capability values', () => {
      expect(workflow.capabilities).toContain('diagnostics');
      expect(workflow.capabilities).toContain('troubleshooting');
      expect(workflow.capabilities).toContain('system-analysis');
      expect(workflow.capabilities).toContain('environment-validation');
    });

    it('should not have targets or projectTypes properties', () => {
      expect(workflow).not.toHaveProperty('targets');
      expect(workflow).not.toHaveProperty('projectTypes');
    });
  });
});
