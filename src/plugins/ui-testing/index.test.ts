/**
 * Tests for ui-testing workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from './index.ts';

describe('ui-testing workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
      expect(workflow).toHaveProperty('platforms');
      expect(workflow).toHaveProperty('targets');
      expect(workflow).toHaveProperty('capabilities');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('UI Testing & Automation');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'UI automation and accessibility testing tools for iOS simulators. Perform gestures, interactions, screenshots, and UI analysis for automated testing workflows.',
      );
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['iOS']);
    });

    it('should have correct targets array', () => {
      expect(workflow.targets).toEqual(['simulator']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual([
        'ui-automation',
        'gesture-simulation',
        'screenshot-capture',
        'accessibility-testing',
        'ui-analysis',
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
      expect(Array.isArray(workflow.capabilities)).toBe(true);

      expect(workflow.platforms.length).toBeGreaterThan(0);
      expect(workflow.targets.length).toBeGreaterThan(0);
      expect(workflow.capabilities.length).toBeGreaterThan(0);
    });

    it('should contain expected platform values', () => {
      expect(workflow.platforms).toContain('iOS');
    });

    it('should contain expected target values', () => {
      expect(workflow.targets).toContain('simulator');
    });

    it('should contain expected capability values', () => {
      expect(workflow.capabilities).toContain('ui-automation');
      expect(workflow.capabilities).toContain('gesture-simulation');
      expect(workflow.capabilities).toContain('screenshot-capture');
      expect(workflow.capabilities).toContain('accessibility-testing');
      expect(workflow.capabilities).toContain('ui-analysis');
    });

    it('should not have projectTypes property', () => {
      expect(workflow).not.toHaveProperty('projectTypes');
    });
  });
});
