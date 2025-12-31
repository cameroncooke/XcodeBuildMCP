/**
 * Tests for simulator-management workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.ts';

describe('simulator-management workflow metadata', () => {
  describe('Workflow Structure', () => {
    it('should export workflow object with required properties', () => {
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
    });

    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('Simulator Management');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Tools for managing simulators from booting, opening simulators, listing simulators, stopping simulators, erasing simulator content and settings, and setting simulator environment options like location, network, statusbar and appearance.',
      );
    });
  });
});
