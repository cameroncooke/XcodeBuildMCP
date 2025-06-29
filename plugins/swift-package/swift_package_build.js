import {
  swiftPackageBuildToolName,
  swiftPackageBuildToolDescription,
  swiftPackageBuildToolSchema,
  swiftPackageBuildToolHandler,
} from '../../src/tools/build-swift-package/index.js';

// Plugin definition that wraps the existing tested handler (following the migration plan)
export default {
  name: swiftPackageBuildToolName,
  description: swiftPackageBuildToolDescription,
  schema: swiftPackageBuildToolSchema,
  async handler(params) {
    // Delegate to the existing tested handler
    return await swiftPackageBuildToolHandler(params);
  },
}; 