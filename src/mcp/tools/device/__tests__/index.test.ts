/**
 * Tests for device-project workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('device-project workflow metadata', () => {
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
      expect(workflow.name).toBe('iOS Device Development');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting physical devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Build, test, deploy, and debug apps on real hardware.',
      );
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['iOS', 'watchOS', 'tvOS', 'visionOS']);
    });

    it('should have correct targets array', () => {
      expect(workflow.targets).toEqual(['device']);
    });

    it('should have correct projectTypes array', () => {
      expect(workflow.projectTypes).toEqual(['project', 'workspace']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual([
        'build',
        'test',
        'deploy',
        'debug',
        'log-capture',
        'device-management',
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
      expect(workflow.platforms).toContain('watchOS');
      expect(workflow.platforms).toContain('tvOS');
      expect(workflow.platforms).toContain('visionOS');
    });

    it('should contain expected target values', () => {
      expect(workflow.targets).toContain('device');
    });

    it('should contain expected project type values', () => {
      expect(workflow.projectTypes).toContain('project');
    });

    it('should contain expected capability values', () => {
      expect(workflow.capabilities).toContain('build');
      expect(workflow.capabilities).toContain('test');
      expect(workflow.capabilities).toContain('deploy');
      expect(workflow.capabilities).toContain('debug');
      expect(workflow.capabilities).toContain('log-capture');
      expect(workflow.capabilities).toContain('device-management');
    });
  });
});
