import {
  cleanSwiftPackageToolName,
  cleanSwiftPackageToolDescription,
  cleanSwiftPackageToolSchema,
  cleanSwiftPackageToolHandler
} from '../../src/tools/run-swift-package/index.js';

export default {
  name: cleanSwiftPackageToolName,
  description: cleanSwiftPackageToolDescription,
  schema: cleanSwiftPackageToolSchema,
  handler: cleanSwiftPackageToolHandler,
};