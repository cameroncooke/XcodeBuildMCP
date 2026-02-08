import { describe, expect, it } from 'vitest';
import { createMockExecutor } from '../../test-utils/mock-executors.ts';
import { XcodePlatform } from '../../types/common.ts';
import { detectPlatformFromScheme } from '../platform-detection.ts';

describe('detectPlatformFromScheme', () => {
  it('detects simulator platform from SDKROOT', async () => {
    const executor = createMockExecutor({
      success: true,
      output: 'SDKROOT = watchsimulator\nSUPPORTED_PLATFORMS = watchsimulator watchos',
    });

    const result = await detectPlatformFromScheme(
      '/tmp/Test.xcodeproj',
      undefined,
      'WatchScheme',
      executor,
    );

    expect(result.platform).toBe(XcodePlatform.watchOSSimulator);
    expect(result.sdkroot).toBe('watchsimulator');
  });

  it('falls back to SUPPORTED_PLATFORMS when SDKROOT is missing', async () => {
    const executor = createMockExecutor({
      success: true,
      output: 'SUPPORTED_PLATFORMS = appletvsimulator appletvos',
    });

    const result = await detectPlatformFromScheme(
      undefined,
      '/tmp/Test.xcworkspace',
      'TVScheme',
      executor,
    );

    expect(result.platform).toBe(XcodePlatform.tvOSSimulator);
    expect(result.sdkroot).toBeNull();
  });

  it('returns null platform for non-simulator SDKROOT values', async () => {
    const executor = createMockExecutor({
      success: true,
      output: 'SDKROOT = macosx\nSUPPORTED_PLATFORMS = macosx',
    });

    const result = await detectPlatformFromScheme(
      '/tmp/Test.xcodeproj',
      undefined,
      'MacScheme',
      executor,
    );

    expect(result.platform).toBeNull();
    expect(result.sdkroot).toBe('macosx');
  });

  it('prefers simulator SDKROOT when build settings contain multiple blocks', async () => {
    const executor = createMockExecutor({
      success: true,
      output: `
Build settings for action build and target DeviceTarget:
    SDKROOT = iphoneos
    SUPPORTED_PLATFORMS = iphoneos

Build settings for action build and target SimulatorTarget:
    SDKROOT = iphonesimulator18.0
    SUPPORTED_PLATFORMS = iphonesimulator iphoneos
`,
    });

    const result = await detectPlatformFromScheme(
      '/tmp/Test.xcodeproj',
      undefined,
      'MixedScheme',
      executor,
    );

    expect(result.platform).toBe(XcodePlatform.iOSSimulator);
    expect(result.sdkroot).toBe('iphonesimulator18.0');
  });

  it('returns error when both projectPath and workspacePath are provided', async () => {
    const executor = createMockExecutor({
      success: true,
      output: 'SDKROOT = iphonesimulator',
    });

    const result = await detectPlatformFromScheme(
      '/tmp/Test.xcodeproj',
      '/tmp/Test.xcworkspace',
      'AmbiguousScheme',
      executor,
    );

    expect(result.platform).toBeNull();
    expect(result.error).toContain('mutually exclusive');
  });

  it('surfaces command failure details', async () => {
    const executor = createMockExecutor({
      success: false,
      error: 'xcodebuild failed',
    });

    const result = await detectPlatformFromScheme(
      '/tmp/Test.xcodeproj',
      undefined,
      'BrokenScheme',
      executor,
    );

    expect(result.platform).toBeNull();
    expect(result.error).toBe('xcodebuild failed');
  });
});
