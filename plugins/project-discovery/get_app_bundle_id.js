import {
  getAppBundleIdToolName,
  getAppBundleIdToolDescription,
  getAppBundleIdToolSchema,
  getAppBundleIdToolHandler,
} from '../../src/tools/bundle-id/index.js';

// Plugin definition that wraps the existing tested handler (following the migration plan)
export default {
  name: getAppBundleIdToolName,
  description: getAppBundleIdToolDescription,
  schema: getAppBundleIdToolSchema,
  async handler(params) {
    // Delegate to the existing tested handler
    return await getAppBundleIdToolHandler(params);
  },
};