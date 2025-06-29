import {
  stopSwiftPackageToolName,
  stopSwiftPackageToolDescription,
  stopSwiftPackageToolSchema,
  stopSwiftPackageToolHandler
} from '../../src/tools/run-swift-package/index.js';

export default {
  name: stopSwiftPackageToolName,
  description: stopSwiftPackageToolDescription,
  schema: stopSwiftPackageToolSchema,
  handler: stopSwiftPackageToolHandler,
};