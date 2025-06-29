/**
 * Tests for get_mac_app_path_proj plugin
 * 
 * This tests the get_mac_app_path_proj tool which gets the app bundle path 
 * for a macOS application using a project file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import getMacAppPathProjPlugin from './get_mac_app_path_proj.js';

// Mock the executeCommand function
vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('get_mac_app_path_proj plugin', () => {
  let mockServer: McpServer;

  beforeEach(() => {
    // Create a mock server
    mockServer = {
      setRequestHandler: vi.fn(),
    } as unknown as McpServer;

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should have the correct plugin structure', () => {
    expect(getMacAppPathProjPlugin).toBeDefined();
    expect(getMacAppPathProjPlugin.name).toBe('get_mac_app_path_proj');
    expect(getMacAppPathProjPlugin.description).toContain('macOS application using a project file');
    expect(getMacAppPathProjPlugin.schema).toBeDefined();
    expect(getMacAppPathProjPlugin.handler).toBeDefined();
    expect(typeof getMacAppPathProjPlugin.handler).toBe('function');
  });

  it('should have the required schema properties', () => {
    const schema = getMacAppPathProjPlugin.schema;
    
    expect(schema.projectPath).toBeDefined();
    expect(schema.scheme).toBeDefined();
    expect(schema.configuration).toBeDefined();
    expect(schema.arch).toBeDefined();
  });

  it('should have the correct tool name', () => {
    expect(getMacAppPathProjPlugin.name).toBe('get_mac_app_path_proj');
  });

  it('should have a description mentioning project file', () => {
    expect(getMacAppPathProjPlugin.description).toContain('project file');
    expect(getMacAppPathProjPlugin.description).toContain('projectPath');
  });
});