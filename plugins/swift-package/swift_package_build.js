import { z } from 'zod';

const swiftConfigurationSchema = z
  .enum(['debug', 'release'])
  .optional()
  .describe("Build configuration: 'debug' (default) or 'release'");

const swiftArchitecturesSchema = z
  .enum(['arm64', 'x86_64'])
  .array()
  .optional()
  .describe('Architectures to build for (e.g. arm64, x86_64)');

const parseAsLibrarySchema = z
  .boolean()
  .optional()
  .describe('Add -parse-as-library flag for @main support (default: false)');

// Plugin definition without external dependencies  
export default {
  name: 'swift_package_build',
  description: 'Builds a Swift Package with swift build',
  schema: {
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
    targetName: z.string().optional().describe('Optional target to build'),
    configuration: swiftConfigurationSchema,
    architectures: swiftArchitecturesSchema,
    parseAsLibrary: parseAsLibrarySchema,
  },
  async handler(params) {
    // For now, return a simple response to test the plugin system
    return {
      content: [
        { type: 'text', text: '🎉 Plugin system is working! swift_package_build loaded successfully.' },
        { type: 'text', text: `Would build package at: ${params.packagePath}` },
      ],
      isError: false,
    };
  },
}; 