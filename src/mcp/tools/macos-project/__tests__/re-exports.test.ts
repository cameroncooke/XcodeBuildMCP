/**
 * Tests for macos-project re-export files
 * These files re-export tools from macos-workspace to avoid duplication
 */
import { describe, it, expect } from 'vitest';

// Import all re-export tools
import testMacosProj from '../test_macos_proj.ts';
import buildMacos from '../build_macos.ts';
import buildRunMacos from '../build_run_macos.ts';
import getMacosAppPath from '../get_macos_app_path.ts';

describe('macos-project re-exports', () => {
  describe('test_macos_proj re-export', () => {
    it('should re-export test_macos_proj tool correctly', () => {
      expect(testMacosProj.name).toBe('test_macos_proj');
      expect(typeof testMacosProj.handler).toBe('function');
      expect(testMacosProj.schema).toBeDefined();
      expect(typeof testMacosProj.description).toBe('string');
    });
  });

  describe('build_macos re-export', () => {
    it('should re-export build_macos tool correctly', () => {
      expect(buildMacos.name).toBe('build_macos');
      expect(typeof buildMacos.handler).toBe('function');
      expect(buildMacos.schema).toBeDefined();
      expect(typeof buildMacos.description).toBe('string');
    });
  });

  describe('build_run_macos re-export', () => {
    it('should re-export build_run_macos tool correctly', () => {
      expect(buildRunMacos.name).toBe('build_run_macos');
      expect(typeof buildRunMacos.handler).toBe('function');
      expect(buildRunMacos.schema).toBeDefined();
      expect(typeof buildRunMacos.description).toBe('string');
    });
  });

  describe('get_macos_app_path re-export', () => {
    it('should re-export get_macos_app_path tool correctly', () => {
      expect(getMacosAppPath.name).toBe('get_macos_app_path');
      expect(typeof getMacosAppPath.handler).toBe('function');
      expect(getMacosAppPath.schema).toBeDefined();
      expect(typeof getMacosAppPath.description).toBe('string');
    });
  });

  describe('All re-exports validation', () => {
    const reExports = [
      { tool: testMacosProj, name: 'test_macos_proj' },
      { tool: buildMacos, name: 'build_macos' },
      { tool: buildRunMacos, name: 'build_run_macos' },
      { tool: getMacosAppPath, name: 'get_macos_app_path' },
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
