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
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('session-management');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Manage session defaults for project/workspace paths, scheme, configuration, simulatorName/simulatorId, deviceId, useLatestOS, arch, suppressWarnings, derivedDataPath, preferXcodebuild, platform, and bundleId. Defaults can be seeded from .xcodebuildmcp/config.yaml at startup.',
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
