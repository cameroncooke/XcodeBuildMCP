/**
 * Tests for build_run_sim_name_proj plugin re-export
 * 
 * This plugin re-exports from simulator-project/build_run_sim_name_proj.js
 * Testing that the re-export works correctly.
 */

import { describe, it, expect } from 'vitest';

// ✅ Import the re-exported plugin
import buildRunSimNameProjPlugin from './build_run_sim_name_proj.ts';

describe('build_run_sim_name_proj re-export plugin', () => {
  it('should export correct plugin structure via re-export', () => {
    expect(buildRunSimNameProjPlugin).toHaveProperty('name', 'build_run_sim_name_proj');
    expect(buildRunSimNameProjPlugin).toHaveProperty('description');
    expect(buildRunSimNameProjPlugin).toHaveProperty('schema');
    expect(buildRunSimNameProjPlugin).toHaveProperty('handler');
    expect(typeof buildRunSimNameProjPlugin.handler).toBe('function');
  });

  it('should have the correct tool name', () => {
    expect(buildRunSimNameProjPlugin.name).toBe('build_run_sim_name_proj');
  });

  it('should have the correct description', () => {
    expect(buildRunSimNameProjPlugin.description).toContain('Builds and runs an app from a project file');
    expect(buildRunSimNameProjPlugin.description).toContain('projectPath');
    expect(buildRunSimNameProjPlugin.description).toContain('scheme');
    expect(buildRunSimNameProjPlugin.description).toContain('simulatorName');
  });

  it('should have the correct schema structure', () => {
    expect(buildRunSimNameProjPlugin.schema).toHaveProperty('projectPath');
    expect(buildRunSimNameProjPlugin.schema).toHaveProperty('scheme');
    expect(buildRunSimNameProjPlugin.schema).toHaveProperty('simulatorName');
    expect(buildRunSimNameProjPlugin.schema).toHaveProperty('configuration');
    expect(buildRunSimNameProjPlugin.schema).toHaveProperty('derivedDataPath');
    expect(buildRunSimNameProjPlugin.schema).toHaveProperty('extraArgs');
    expect(buildRunSimNameProjPlugin.schema).toHaveProperty('useLatestOS');
    expect(buildRunSimNameProjPlugin.schema).toHaveProperty('preferXcodebuild');
  });
});