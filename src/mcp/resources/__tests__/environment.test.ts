import { describe, it, expect } from 'vitest';

import environmentResource, { environmentResourceLogic } from '../environment.js';
import { createMockExecutor } from '../../../utils/command.js';

describe('environment resource', () => {
  describe('Export Field Validation', () => {
    it('should export correct uri', () => {
      expect(environmentResource.uri).toBe('xcodebuildmcp://environment');
    });

    it('should export correct description', () => {
      expect(environmentResource.description).toBe(
        'Comprehensive development environment diagnostic information and configuration status',
      );
    });

    it('should export correct mimeType', () => {
      expect(environmentResource.mimeType).toBe('text/plain');
    });

    it('should export handler function', () => {
      expect(typeof environmentResource.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    it('should handle successful environment data retrieval', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock command output',
      });

      const result = await environmentResourceLogic(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# XcodeBuildMCP Diagnostic Report');
      expect(result.contents[0].text).toContain('## System Information');
      expect(result.contents[0].text).toContain('## Node.js Information');
      expect(result.contents[0].text).toContain('## Dependencies');
      expect(result.contents[0].text).toContain('## Environment Variables');
      expect(result.contents[0].text).toContain('## Feature Status');
    });

    it('should handle spawn errors by showing diagnostic info', async () => {
      const mockExecutor = createMockExecutor(new Error('spawn xcrun ENOENT'));

      const result = await environmentResourceLogic(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# XcodeBuildMCP Diagnostic Report');
      expect(result.contents[0].text).toContain('Error: spawn xcrun ENOENT');
    });

    it('should include required diagnostic sections', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock output',
      });

      const result = await environmentResourceLogic(mockExecutor);

      expect(result.contents[0].text).toContain('## Troubleshooting Tips');
      expect(result.contents[0].text).toContain('brew tap cameroncooke/axe');
      expect(result.contents[0].text).toContain('INCREMENTAL_BUILDS_ENABLED=1');
      expect(result.contents[0].text).toContain('discover_tools');
    });

    it('should provide feature status information', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock output',
      });

      const result = await environmentResourceLogic(mockExecutor);

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

      const result = await environmentResourceLogic(mockExecutor);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# XcodeBuildMCP Diagnostic Report');
    });
  });
});
