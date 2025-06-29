import {
  listSchemsProjToolName,
  listSchemsProjToolDescription,
  listSchemsProjToolSchema,
  listSchemsProjToolHandler,
} from '../../src/tools/build-settings/index.js';

// Plugin definition that wraps the existing tested handler (following the migration plan)
export default {
  name: listSchemsProjToolName,
  description: listSchemsProjToolDescription,
  schema: listSchemsProjToolSchema,
  async handler(params) {
    // Delegate to the existing tested handler
    return await listSchemsProjToolHandler(params);
  },
};