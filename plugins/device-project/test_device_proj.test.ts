/**
 * Tests for test_device_proj plugin
 */

import { describe, it, expect } from 'vitest';
import testDeviceProj from './test_device_proj.ts';

describe('test_device_proj plugin', () => {
  it('should have correct plugin structure', () => {
    expect(testDeviceProj).toBeDefined();
    expect(testDeviceProj.name).toBe('test_device_proj');
    expect(testDeviceProj.description).toContain('Runs tests for an Apple project on a physical device');
    expect(testDeviceProj.description).toContain('IMPORTANT: Requires projectPath, scheme, and deviceId');
    expect(testDeviceProj.schema).toBeDefined();
    expect(testDeviceProj.handler).toBeDefined();
    expect(typeof testDeviceProj.handler).toBe('function');
  });

  it('should have required schema fields', () => {
    const { schema } = testDeviceProj;
    expect(schema.projectPath).toBeDefined();
    expect(schema.scheme).toBeDefined();
    expect(schema.deviceId).toBeDefined();
    expect(schema.configuration).toBeDefined();
    expect(schema.derivedDataPath).toBeDefined();
    expect(schema.extraArgs).toBeDefined();
    expect(schema.preferXcodebuild).toBeDefined();
    expect(schema.platform).toBeDefined();
  });

  it('should have handler with correct signature', () => {
    expect(testDeviceProj.handler).toBeInstanceOf(Function);
    expect(testDeviceProj.handler.constructor.name).toBe('AsyncFunction');
  });
});