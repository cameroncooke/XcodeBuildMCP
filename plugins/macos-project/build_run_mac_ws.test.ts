/**
 * Tests for build_run_mac_ws Plugin Re-export
 *
 * This test file verifies the re-export of build_run_mac_ws from macos-workspace
 * to ensure it's accessible in the macos-project plugin directory.
 */

import { describe, it, expect } from 'vitest';

// Import the re-exported plugin
import buildRunMacWs from './build_run_mac_ws.ts';

describe('build_run_mac_ws Re-export Plugin', () => {
  describe('Plugin Structure', () => {
    it('should have correct plugin structure via re-export', () => {
      expect(buildRunMacWs).toBeDefined();
      expect(buildRunMacWs.name).toBe('build_run_mac_ws');
      expect(buildRunMacWs.description).toBe('Builds and runs a macOS app from a workspace in one step.');
      expect(buildRunMacWs.schema).toBeDefined();
      expect(buildRunMacWs.handler).toBeDefined();
      expect(typeof buildRunMacWs.handler).toBe('function');
    });

    it('should have required schema properties', () => {
      expect(buildRunMacWs.schema.workspacePath).toBeDefined();
      expect(buildRunMacWs.schema.scheme).toBeDefined();
      expect(buildRunMacWs.schema.configuration).toBeDefined();
      expect(buildRunMacWs.schema.derivedDataPath).toBeDefined();
      expect(buildRunMacWs.schema.arch).toBeDefined();
      expect(buildRunMacWs.schema.extraArgs).toBeDefined();
      expect(buildRunMacWs.schema.preferXcodebuild).toBeDefined();
    });
  });
});