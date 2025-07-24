import { describe, it, expect } from 'vitest';

import swiftPackagesResource from '../swift-packages.js';
import { createMockExecutor } from '../../../utils/command.js';

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
    it('should handle no running processes', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await swiftPackagesResource.handler(
        new URL('xcodebuildmcp://swift-packages'),
        mockExecutor,
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('ℹ️ No Swift Package processes currently running.');
      expect(result.contents[0].text).toContain('💡 Use swift_package_run to start an executable.');
    });

    it('should handle spawn errors gracefully', async () => {
      const mockExecutor = createMockExecutor(new Error('Process access error'));

      const result = await swiftPackagesResource.handler(
        new URL('xcodebuildmcp://swift-packages'),
        mockExecutor,
      );

      expect(result.contents).toHaveLength(1);
      // The swift_package_list logic handles errors gracefully and returns standard "no processes" message
      expect(result.contents[0].text).toContain('ℹ️ No Swift Package processes currently running.');
    });

    it('should provide appropriate response when no processes are running', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await swiftPackagesResource.handler(
        new URL('xcodebuildmcp://swift-packages'),
        mockExecutor,
      );

      expect(result.contents).toHaveLength(1);
      const text = result.contents[0].text;
      expect(text).toContain('ℹ️ No Swift Package processes currently running.');
      expect(text).toContain('💡 Use swift_package_run to start an executable.');
    });

    it('should handle error responses from swift_package_listLogic', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Mock error',
      });

      const result = await swiftPackagesResource.handler(
        new URL('xcodebuildmcp://swift-packages'),
        mockExecutor,
      );

      // Since the logic function doesn't return errors for this simple case,
      // it should return the standard "no processes" message
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('ℹ️ No Swift Package processes currently running.');
    });

    it('should combine multiple content parts correctly', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await swiftPackagesResource.handler(
        new URL('xcodebuildmcp://swift-packages'),
        mockExecutor,
      );

      expect(result.contents).toHaveLength(1);
      expect(typeof result.contents[0].text).toBe('string');
    });
  });
});
