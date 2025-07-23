/**
 * Tests for logging workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('logging workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
      expect(workflow).toHaveProperty('platforms');
      expect(workflow).toHaveProperty('targets');
      expect(workflow).toHaveProperty('capabilities');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('Log Capture & Management');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Log capture and management tools for iOS simulators and physical devices. Start, stop, and analyze application and system logs during development and testing.',
      );
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['iOS', 'watchOS', 'tvOS', 'visionOS']);
    });

    it('should have correct targets array', () => {
      expect(workflow.targets).toEqual(['simulator', 'device']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual([
        'log-capture',
        'log-analysis',
        'debugging',
        'monitoring',
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
      expect(workflow.platforms).toContain('watchOS');
      expect(workflow.platforms).toContain('tvOS');
      expect(workflow.platforms).toContain('visionOS');
    });

    it('should contain expected target values', () => {
      expect(workflow.targets).toContain('simulator');
      expect(workflow.targets).toContain('device');
    });

    it('should contain expected capability values', () => {
      expect(workflow.capabilities).toContain('log-capture');
      expect(workflow.capabilities).toContain('log-analysis');
      expect(workflow.capabilities).toContain('debugging');
      expect(workflow.capabilities).toContain('monitoring');
    });

    it('should not have projectTypes property', () => {
      expect(workflow).not.toHaveProperty('projectTypes');
    });
  });
});
