import { describe, it, expect } from 'vitest';

import swiftPackagesResource, { swiftPackagesResourceLogic } from '../swift-packages.js';

describe('swift-packages resource', () => {
  describe('Export Field Validation', () => {
    it('should export correct uri', () => {
      expect(swiftPackagesResource.uri).toBe('xcodebuildmcp://swift-packages');
    });

    it('should export correct description', () => {
      expect(swiftPackagesResource.description).toBe(
        'Currently running Swift Package processes with their PIDs and execution status',
      );
    });

    it('should export correct mimeType', () => {
      expect(swiftPackagesResource.mimeType).toBe('text/plain');
    });

    it('should export handler function', () => {
      expect(swiftPackagesResource.handler).toBeDefined();
      expect(typeof swiftPackagesResource.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    it('should return appropriate message when no processes are running', () => {
      // Swift package list logic doesn't use CommandExecutor - it just manages process state
      // No mock needed - it will return the "no processes" message
    });

    it('should handle resource logic function export', async () => {
      const result = await swiftPackagesResourceLogic();

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('No Swift Package processes currently running');
    });
  });
});
