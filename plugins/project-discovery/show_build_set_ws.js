import {
  showBuildSetWsToolName,
  showBuildSetWsToolDescription,
  showBuildSetWsToolSchema,
  showBuildSetWsToolHandler,
} from '../../src/tools/build-settings/index.js';

// Plugin definition that wraps the existing tested handler (following the migration plan)
export default {
  name: showBuildSetWsToolName,
  description: showBuildSetWsToolDescription,
  schema: showBuildSetWsToolSchema,
  async handler(params) {
    // Delegate to the existing tested handler
    return await showBuildSetWsToolHandler(params);
  },
};