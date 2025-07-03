/**
 * Tests for reset_network_condition plugin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import resetNetworkConditionPlugin from './reset_network_condition.ts';

// Mock the utilities
vi.mock('../../src/utils/simulator.ts', () => ({
  executeSimctlCommandAndRespond: vi.fn(),
}));

vi.mock('../../src/utils/log.ts', () => ({
  log: vi.fn(),
}));

describe('reset_network_condition plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should have required properties', () => {
      expect(resetNetworkConditionPlugin).toHaveProperty('name');
      expect(resetNetworkConditionPlugin).toHaveProperty('description');
      expect(resetNetworkConditionPlugin).toHaveProperty('schema');
      expect(resetNetworkConditionPlugin).toHaveProperty('handler');
    });

    it('should have correct name', () => {
      expect(resetNetworkConditionPlugin.name).toBe('reset_network_condition');
    });

    it('should have correct description', () => {
      expect(resetNetworkConditionPlugin.description).toBe('Resets network conditions to default in the simulator.');
    });

    it('should have valid schema with simulatorUuid', () => {
      expect(resetNetworkConditionPlugin.schema).toHaveProperty('simulatorUuid');
      expect(resetNetworkConditionPlugin.schema.simulatorUuid).toBeDefined();
    });

    it('should have handler function', () => {
      expect(typeof resetNetworkConditionPlugin.handler).toBe('function');
    });
  });

  describe('schema validation', () => {
    it('should require simulatorUuid parameter', () => {
      const schema = resetNetworkConditionPlugin.schema;
      expect(schema.simulatorUuid).toBeDefined();
    });
  });
});