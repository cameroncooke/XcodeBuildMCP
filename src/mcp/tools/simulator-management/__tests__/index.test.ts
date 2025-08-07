/**
 * Tests for simulator-management workflow metadata
 */
import { describe, it, expect } from 'vitest';
import { workflow } from '../index.js';

describe('simulator-management workflow metadata', () => {
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
      expect(workflow.name).toBe('Simulator Management');
    });

    it('should have correct description', () => {
      expect(workflow.description).toBe(
        'Tools for managing simulators from booting, opening simulators, listing simulators, stopping simulators and setting simulator environment options like location, network, statusbar and appearance.',
      );
    });

    it('should have correct platforms array', () => {
      expect(workflow.platforms).toEqual(['iOS']);
    });

    it('should have correct targets array', () => {
      expect(workflow.targets).toEqual(['simulator']);
    });

    it('should have correct projectTypes array', () => {
      expect(workflow.projectTypes).toEqual(['project', 'workspace']);
    });

    it('should have correct capabilities array', () => {
      expect(workflow.capabilities).toEqual([
        'boot',
        'open',
        'list',
        'appearance',
        'location',
        'network',
        'statusbar',
      ]);
    });
  });
});
