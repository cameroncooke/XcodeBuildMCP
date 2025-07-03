import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import discoverProjsPlugin from './discover_projs.ts';

// Mock dependencies
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
}));

vi.mock('../../src/tools/common/index.ts', () => ({
  createTextContent: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('node:path', () => {
  const actualPath = {
    join: (...parts: string[]) => parts.join('/'),
    resolve: (base: string, rel: string = '.') => rel === '.' ? base : `${base}/${rel}`,
    relative: (from: string, to: string) => to.replace(from, '').replace(/^\//, ''),
    normalize: (p: string) => p,
  };
  return {
    default: actualPath,
    ...actualPath,
  };
});

describe('discover_projs plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export the correct plugin structure', () => {
    expect(discoverProjsPlugin.name).toBe('discover_projs');
    expect(discoverProjsPlugin.description).toBe('Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.');
    expect(discoverProjsPlugin).toHaveProperty('schema');
    expect(typeof discoverProjsPlugin.handler).toBe('function');
  });

  it('should have correct tool name', () => {
    expect(discoverProjsPlugin.name).toBe('discover_projs');
  });

  it('should have correct description', () => {
    expect(discoverProjsPlugin.description).toBe('Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.');
  });

  it('should have correct schema properties', () => {
    expect(discoverProjsPlugin.schema.shape).toHaveProperty('workspaceRoot');
    expect(discoverProjsPlugin.schema.shape).toHaveProperty('scanPath');
    expect(discoverProjsPlugin.schema.shape).toHaveProperty('maxDepth');
  });

  it('should have a handler function', () => {
    expect(typeof discoverProjsPlugin.handler).toBe('function');
  });

  it('should have the correct handler', async () => {
    // Test that the plugin has a handler function
    expect(typeof discoverProjsPlugin.handler).toBe('function');
  });
});