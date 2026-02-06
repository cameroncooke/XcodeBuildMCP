import { describe, it, expect } from 'vitest';
import xcodeIdeStateResource, { xcodeIdeStateResourceLogic } from '../xcode-ide-state.ts';

describe('xcode-ide-state resource', () => {
  describe('Export Field Validation', () => {
    it('should export correct uri', () => {
      expect(xcodeIdeStateResource.uri).toBe('xcodebuildmcp://xcode-ide-state');
    });

    it('should export correct name', () => {
      expect(xcodeIdeStateResource.name).toBe('xcode-ide-state');
    });

    it('should export correct description', () => {
      expect(xcodeIdeStateResource.description).toBe(
        "Current Xcode IDE selection (scheme and simulator) from Xcode's UI state",
      );
    });

    it('should export correct mimeType', () => {
      expect(xcodeIdeStateResource.mimeType).toBe('application/json');
    });

    it('should export handler function', () => {
      expect(typeof xcodeIdeStateResource.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    it('should return JSON response with expected structure', async () => {
      const result = await xcodeIdeStateResourceLogic();

      expect(result.contents).toHaveLength(1);
      const parsed = JSON.parse(result.contents[0].text);

      // Response should have the expected structure
      expect(typeof parsed.detected).toBe('boolean');

      // Optional fields may or may not be present
      if (parsed.scheme !== undefined) {
        expect(typeof parsed.scheme).toBe('string');
      }
      if (parsed.simulatorId !== undefined) {
        expect(typeof parsed.simulatorId).toBe('string');
      }
      if (parsed.simulatorName !== undefined) {
        expect(typeof parsed.simulatorName).toBe('string');
      }
      if (parsed.error !== undefined) {
        expect(typeof parsed.error).toBe('string');
      }
    });

    it('should indicate detected=false when no Xcode project found', async () => {
      // Running from the XcodeBuildMCP repo root (not an iOS project)
      // should return detected=false with an error
      const result = await xcodeIdeStateResourceLogic();
      const parsed = JSON.parse(result.contents[0].text);

      // In our test environment without a proper iOS project,
      // we expect either an error or detected=false
      expect(parsed.detected === false || parsed.error !== undefined).toBe(true);
    });
  });
});
