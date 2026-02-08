import * as z from 'zod';

export const sessionDefaultKeys = [
  'projectPath',
  'workspacePath',
  'scheme',
  'configuration',
  'simulatorName',
  'simulatorId',
  'simulatorPlatform',
  'deviceId',
  'useLatestOS',
  'arch',
  'suppressWarnings',
  'derivedDataPath',
  'preferXcodebuild',
  'platform',
  'bundleId',
] as const;

export type SessionDefaultKey = (typeof sessionDefaultKeys)[number];

export const sessionDefaultsSchema = z.object({
  projectPath: z.string().optional().describe('xcodeproj path (xor workspacePath)'),
  workspacePath: z.string().optional().describe('xcworkspace path (xor projectPath)'),
  scheme: z.string().optional(),
  configuration: z
    .string()
    .optional()
    .describe("Build configuration for Xcode and SwiftPM tools (e.g. 'Debug' or 'Release')."),
  simulatorName: z.string().optional(),
  simulatorId: z.string().optional(),
  simulatorPlatform: z
    .enum(['iOS Simulator', 'watchOS Simulator', 'tvOS Simulator', 'visionOS Simulator'])
    .optional()
    .describe('Cached inferred simulator platform.'),
  deviceId: z.string().optional(),
  useLatestOS: z.boolean().optional(),
  arch: z.enum(['arm64', 'x86_64']).optional(),
  suppressWarnings: z.boolean().optional(),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Default DerivedData path for Xcode build/test/clean tools.'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe('Prefer xcodebuild over incremental builds for Xcode build/test/clean tools.'),
  platform: z
    .string()
    .optional()
    .describe('Default device platform for device tools (e.g. iOS, watchOS).'),
  bundleId: z
    .string()
    .optional()
    .describe('Default bundle ID for launch/stop/log tools when working on a single app.'),
});
