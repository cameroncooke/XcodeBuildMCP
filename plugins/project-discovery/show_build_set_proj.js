import {
  showBuildSetProjToolName,
  showBuildSetProjToolDescription,
  showBuildSetProjToolSchema,
  showBuildSetProjToolHandler,
} from '../../src/tools/build-settings/index.js';

// Plugin definition that wraps the existing tested handler (following the migration plan)
export default {
  name: showBuildSetProjToolName,
  description: showBuildSetProjToolDescription,
  schema: showBuildSetProjToolSchema,
  async handler(params) {
    // Delegate to the existing tested handler
    return await showBuildSetProjToolHandler(params);
  },
};