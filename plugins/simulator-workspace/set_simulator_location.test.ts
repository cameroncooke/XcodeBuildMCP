/**
 * @file Test suite for set_simulator_location plugin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import setSimulatorLocationPlugin from './set_simulator_location.ts';

// Mock dependencies
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
}));

describe('set_simulator_location plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export correct plugin structure', () => {
    expect(setSimulatorLocationPlugin).toHaveProperty('name');
    expect(setSimulatorLocationPlugin).toHaveProperty('description');
    expect(setSimulatorLocationPlugin).toHaveProperty('schema');
    expect(setSimulatorLocationPlugin).toHaveProperty('handler');
  });

  it('should have correct tool name', () => {
    expect(setSimulatorLocationPlugin.name).toBe('set_simulator_location');
  });

  it('should have correct description', () => {
    expect(setSimulatorLocationPlugin.description).toBe('Sets a custom GPS location for the simulator.');
  });

  it('should have correct schema structure', () => {
    expect(setSimulatorLocationPlugin.schema).toHaveProperty('simulatorUuid');
    expect(setSimulatorLocationPlugin.schema).toHaveProperty('latitude');
    expect(setSimulatorLocationPlugin.schema).toHaveProperty('longitude');
  });

  it('should have handler function', () => {
    expect(typeof setSimulatorLocationPlugin.handler).toBe('function');
  });

  it('should export all required properties', () => {
    const expectedKeys = ['name', 'description', 'schema', 'handler'];
    expect(Object.keys(setSimulatorLocationPlugin)).toEqual(expect.arrayContaining(expectedKeys));
    expect(Object.keys(setSimulatorLocationPlugin)).toHaveLength(expectedKeys.length);
  });
});