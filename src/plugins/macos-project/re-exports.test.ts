/**
 * Tests for macos-project re-export files
 * These files re-export tools from macos-workspace to avoid duplication
 */
import { describe, it, expect } from 'vitest';

// Import all re-export tools
import testMacosProj from './test_macos_proj.ts';
import buildMacProj from './build_mac_proj.ts';
import buildMacWs from './build_mac_ws.ts';
import buildRunMacWs from './build_run_mac_ws.ts';
import getMacAppPathWs from './get_mac_app_path_ws.ts';

describe('macos-project re-exports', () => {
  describe('test_macos_proj re-export', () => {
    it('should re-export test_macos_proj tool correctly', () => {
      expect(testMacosProj.name).toBe('test_macos_proj');
      expect(typeof testMacosProj.handler).toBe('function');
      expect(testMacosProj.schema).toBeDefined();
      expect(typeof testMacosProj.description).toBe('string');
    });
  });

  describe('build_mac_proj re-export', () => {
    it('should re-export build_mac_proj tool correctly', () => {
      expect(buildMacProj.name).toBe('build_mac_proj');
      expect(typeof buildMacProj.handler).toBe('function');
      expect(buildMacProj.schema).toBeDefined();
      expect(typeof buildMacProj.description).toBe('string');
    });
  });

  describe('build_mac_ws re-export', () => {
    it('should re-export build_mac_ws tool correctly', () => {
      expect(buildMacWs.name).toBe('build_mac_ws');
      expect(typeof buildMacWs.handler).toBe('function');
      expect(buildMacWs.schema).toBeDefined();
      expect(typeof buildMacWs.description).toBe('string');
    });
  });

  describe('build_run_mac_ws re-export', () => {
    it('should re-export build_run_mac_ws tool correctly', () => {
      expect(buildRunMacWs.name).toBe('build_run_mac_ws');
      expect(typeof buildRunMacWs.handler).toBe('function');
      expect(buildRunMacWs.schema).toBeDefined();
      expect(typeof buildRunMacWs.description).toBe('string');
    });
  });

  describe('get_mac_app_path_ws re-export', () => {
    it('should re-export get_mac_app_path_ws tool correctly', () => {
      expect(getMacAppPathWs.name).toBe('get_mac_app_path_ws');
      expect(typeof getMacAppPathWs.handler).toBe('function');
      expect(getMacAppPathWs.schema).toBeDefined();
      expect(typeof getMacAppPathWs.description).toBe('string');
    });
  });

  describe('All re-exports validation', () => {
    const reExports = [
      { tool: testMacosProj, name: 'test_macos_proj' },
      { tool: buildMacProj, name: 'build_mac_proj' },
      { tool: buildMacWs, name: 'build_mac_ws' },
      { tool: buildRunMacWs, name: 'build_run_mac_ws' },
      { tool: getMacAppPathWs, name: 'get_mac_app_path_ws' },
    ];

    it('should have all required tool properties', () => {
      reExports.forEach(({ tool, name }) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('schema');
        expect(tool).toHaveProperty('handler');
        expect(tool.name).toBe(name);
      });
    });

    it('should have callable handlers', () => {
      reExports.forEach(({ tool, name }) => {
        expect(typeof tool.handler).toBe('function');
        expect(tool.handler.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid schemas', () => {
      reExports.forEach(({ tool, name }) => {
        expect(tool.schema).toBeDefined();
        expect(typeof tool.schema).toBe('object');
      });
    });

    it('should have non-empty descriptions', () => {
      reExports.forEach(({ tool, name }) => {
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });
  });
});
