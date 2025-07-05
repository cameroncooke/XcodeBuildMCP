/**
 * Tests for swift-package workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from './index.ts';

describe('swift-package workflow metadata', () => {
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
      expect(workflow.name).toBe('Swift Package Manager');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Swift Package Manager operations for building, testing, running, and managing Swift packages and dependencies. Complete SPM workflow support.',
      );
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['iOS', 'macOS', 'watchOS', 'tvOS', 'visionOS', 'Linux']);
    });

    it('should have correct targets array', () => {
      expect(workflow.targets).toEqual(['package']);
    });

    it('should have correct projectTypes array', () => {
      expect(workflow.projectTypes).toEqual(['swift-package']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual([
        'build',
        'test',
        'run',
        'clean',
        'dependency-management',
        'package-management',
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
      expect(workflow.platforms).toContain('watchOS');
      expect(workflow.platforms).toContain('tvOS');
      expect(workflow.platforms).toContain('visionOS');
      expect(workflow.platforms).toContain('Linux');
    });

    it('should contain expected target values', () => {
      expect(workflow.targets).toContain('package');
    });

    it('should contain expected project type values', () => {
      expect(workflow.projectTypes).toContain('swift-package');
    });

    it('should contain expected capability values', () => {
      expect(workflow.capabilities).toContain('build');
      expect(workflow.capabilities).toContain('test');
      expect(workflow.capabilities).toContain('run');
      expect(workflow.capabilities).toContain('clean');
      expect(workflow.capabilities).toContain('dependency-management');
      expect(workflow.capabilities).toContain('package-management');
    });
  });
});
