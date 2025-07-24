import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

import simulatorsResource from '../simulators.js';
import { createMockExecutor } from '../../../utils/command.js';

describe('simulators resource', () => {
  describe('Export Field Validation', () => {
    it('should export correct uri', () => {
      expect(simulatorsResource.uri).toBe('xcodebuildmcp://simulators');
    });

    it('should export correct description', () => {
      expect(simulatorsResource.description).toBe(
        'Available iOS simulators with their UUIDs and states',
      );
    });

    it('should export correct mimeType', () => {
      expect(simulatorsResource.mimeType).toBe('text/plain');
    });

    it('should export handler function', () => {
      expect(typeof simulatorsResource.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    it('should handle successful simulator data retrieval', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'ABC123-DEF456-GHI789',
                state: 'Shutdown',
                isAvailable: true,
              },
            ],
          },
        }),
      });

      const result = await simulatorsResource.handler(
        new URL('xcodebuildmcp://simulators'),
        mockExecutor,
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('Available iOS Simulators:');
      expect(result.contents[0].text).toContain('iPhone 15 Pro');
      expect(result.contents[0].text).toContain('ABC123-DEF456-GHI789');
    });

    it('should handle command execution failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Command failed',
      });

      const result = await simulatorsResource.handler(
        new URL('xcodebuildmcp://simulators'),
        mockExecutor,
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('Failed to list simulators');
      expect(result.contents[0].text).toContain('Command failed');
    });

    it('should handle JSON parsing errors', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'invalid json',
      });

      const result = await simulatorsResource.handler(
        new URL('xcodebuildmcp://simulators'),
        mockExecutor,
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toBe('invalid json');
    });

    it('should handle spawn errors', async () => {
      const mockExecutor = createMockExecutor(new Error('spawn xcrun ENOENT'));

      const result = await simulatorsResource.handler(
        new URL('xcodebuildmcp://simulators'),
        mockExecutor,
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('Failed to list simulators');
      expect(result.contents[0].text).toContain('spawn xcrun ENOENT');
    });

    it('should handle empty simulator data', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({ devices: {} }),
      });

      const result = await simulatorsResource.handler(
        new URL('xcodebuildmcp://simulators'),
        mockExecutor,
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('Available iOS Simulators:');
    });

    it('should handle booted simulators correctly', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'ABC123-DEF456-GHI789',
                state: 'Booted',
                isAvailable: true,
              },
            ],
          },
        }),
      });

      const result = await simulatorsResource.handler(
        new URL('xcodebuildmcp://simulators'),
        mockExecutor,
      );

      expect(result.contents[0].text).toContain('[Booted]');
    });

    it('should filter out unavailable simulators', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'ABC123-DEF456-GHI789',
                state: 'Shutdown',
                isAvailable: true,
              },
              {
                name: 'iPhone 14',
                udid: 'XYZ789-UVW456-RST123',
                state: 'Shutdown',
                isAvailable: false,
              },
            ],
          },
        }),
      });

      const result = await simulatorsResource.handler(
        new URL('xcodebuildmcp://simulators'),
        mockExecutor,
      );

      expect(result.contents[0].text).toContain('iPhone 15 Pro');
      expect(result.contents[0].text).not.toContain('iPhone 14');
    });

    it('should include next steps guidance', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'ABC123-DEF456-GHI789',
                state: 'Shutdown',
                isAvailable: true,
              },
            ],
          },
        }),
      });

      const result = await simulatorsResource.handler(
        new URL('xcodebuildmcp://simulators'),
        mockExecutor,
      );

      expect(result.contents[0].text).toContain('Next Steps:');
      expect(result.contents[0].text).toContain('boot_sim');
      expect(result.contents[0].text).toContain('open_sim');
      expect(result.contents[0].text).toContain('build_ios_sim_id_proj');
      expect(result.contents[0].text).toContain('get_sim_app_path_id_proj');
    });
  });
});
