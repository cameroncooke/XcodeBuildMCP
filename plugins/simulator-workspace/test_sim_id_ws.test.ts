/**
 * test_sim_id_ws Re-export Plugin Tests
 *
 * Tests the test_sim_id_ws re-export plugin that imports the primary implementation
 * from simulator-workspace directory.
 */

import { describe, it, expect } from 'vitest';
import testSimIdWsPlugin from './test_sim_id_ws.ts';

describe('test_sim_id_ws re-export plugin tests', () => {
  describe('re-export structure', () => {
    it('should re-export the correct tool structure from simulator-workspace', () => {
      expect(testSimIdWsPlugin).toBeDefined();
      expect(testSimIdWsPlugin.name).toBe('test_sim_id_ws');
      expect(testSimIdWsPlugin.description).toBe(
        'Runs tests for a workspace on a simulator by UUID using xcodebuild test and parses xcresult output.',
      );
      expect(testSimIdWsPlugin.schema).toBeDefined();
      expect(testSimIdWsPlugin.handler).toBeDefined();
      expect(typeof testSimIdWsPlugin.handler).toBe('function');
    });

    it('should have the same schema structure as the primary implementation', () => {
      const schema = testSimIdWsPlugin.schema;
      expect(schema.workspacePath).toBeDefined();
      expect(schema.scheme).toBeDefined();
      expect(schema.simulatorId).toBeDefined();
      expect(schema.configuration).toBeDefined();
      expect(schema.derivedDataPath).toBeDefined();
      expect(schema.extraArgs).toBeDefined();
      expect(schema.useLatestOS).toBeDefined();
      expect(schema.preferXcodebuild).toBeDefined();
    });

    it('should re-export the same handler function', () => {
      expect(typeof testSimIdWsPlugin.handler).toBe('function');
      expect(testSimIdWsPlugin.handler.constructor.name).toBe('AsyncFunction');
    });
  });
});