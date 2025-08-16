import { describe, it, expect } from 'vitest';

import doctorResource, { doctorResourceLogic } from '../doctor.ts';
import { createMockExecutor } from '../../../test-utils/mock-executors.ts';

describe('doctor resource', () => {
  describe('Export Field Validation', () => {
    it('should export correct uri', () => {
      expect(doctorResource.uri).toBe('xcodebuildmcp://doctor');
    });

    it('should export correct description', () => {
      expect(doctorResource.description).toBe(
        'Comprehensive development environment diagnostic information and configuration status',
      );
    });

    it('should export correct mimeType', () => {
      expect(doctorResource.mimeType).toBe('text/plain');
    });

    it('should export handler function', () => {
      expect(typeof doctorResource.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    it('should handle successful environment data retrieval', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock command output',
      });

      const result = await doctorResourceLogic(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('XcodeBuildMCP Doctor');
      expect(result.contents[0].text).toContain('## System Information');
      expect(result.contents[0].text).toContain('## Node.js Information');
      expect(result.contents[0].text).toContain('## Dependencies');
      expect(result.contents[0].text).toContain('## Environment Variables');
      expect(result.contents[0].text).toContain('## Feature Status');
    });

    it('should handle spawn errors by showing doctor info', async () => {
      const mockExecutor = createMockExecutor(new Error('spawn xcrun ENOENT'));

      const result = await doctorResourceLogic(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('XcodeBuildMCP Doctor');
      expect(result.contents[0].text).toContain('Error: spawn xcrun ENOENT');
    });

    it('should include required doctor sections', async () => {
      // Set dynamic tools environment variable to include discover_tools text
      const originalValue = process.env.XCODEBUILDMCP_DYNAMIC_TOOLS;
      process.env.XCODEBUILDMCP_DYNAMIC_TOOLS = 'true';

      try {
        const mockExecutor = createMockExecutor({
          success: true,
          output: 'Mock output',
        });

        const result = await doctorResourceLogic(mockExecutor);

        expect(result.contents[0].text).toContain('## Troubleshooting Tips');
        expect(result.contents[0].text).toContain('brew tap cameroncooke/axe');
        expect(result.contents[0].text).toContain('INCREMENTAL_BUILDS_ENABLED=1');
        expect(result.contents[0].text).toContain('discover_tools');
      } finally {
        // Restore original environment variable
        if (originalValue === undefined) {
          delete process.env.XCODEBUILDMCP_DYNAMIC_TOOLS;
        } else {
          process.env.XCODEBUILDMCP_DYNAMIC_TOOLS = originalValue;
        }
      }
    });

    it('should provide feature status information', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock output',
      });

      const result = await doctorResourceLogic(mockExecutor);

      expect(result.contents[0].text).toContain('### UI Automation (axe)');
      expect(result.contents[0].text).toContain('### Incremental Builds');
      expect(result.contents[0].text).toContain('### Mise Integration');
      expect(result.contents[0].text).toContain('## Tool Availability Summary');
    });

    it('should handle error conditions gracefully', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Command failed',
      });

      const result = await doctorResourceLogic(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('XcodeBuildMCP Doctor');
    });
  });
});
