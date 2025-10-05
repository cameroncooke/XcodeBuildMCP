/**
 * Tests for session-management workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('session-management workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
      expect(workflow).toHaveProperty('platforms');
      expect(workflow).toHaveProperty('targets');
      expect(workflow).toHaveProperty('capabilities');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('session-management');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe('Manage session defaults for XcodeBuildMCP tools.');
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['iOS', 'macOS', 'tvOS', 'watchOS', 'visionOS']);
    });

    it('should have correct targets array', () => {
      expect(workflow.targets).toEqual(['simulator', 'device']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual(['configuration', 'state-management']);
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
      expect(Array.isArray(workflow.capabilities)).toBe(true);

      expect(workflow.platforms.length).toBeGreaterThan(0);
      expect(workflow.targets.length).toBeGreaterThan(0);
      expect(workflow.capabilities.length).toBeGreaterThan(0);
    });
  });
});
