import {
  discoverProjsToolName,
  discoverProjsToolDescription,
  discoverProjsToolSchema,
  discoverProjsToolHandler,
} from '../../src/tools/discover-projects/index.js';

// Plugin definition that wraps the existing tested handler (following the migration plan)
export default {
  name: discoverProjsToolName,
  description: discoverProjsToolDescription,
  schema: discoverProjsToolSchema,
  async handler(params) {
    // Delegate to the existing tested handler
    return await discoverProjsToolHandler(params);
  },
};