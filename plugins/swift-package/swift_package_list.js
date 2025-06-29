import {
  listSwiftPackageToolName,
  listSwiftPackageToolDescription,
  listSwiftPackageToolSchema,
  listSwiftPackageToolHandler
} from '../../src/tools/run-swift-package/index.js';

export default {
  name: listSwiftPackageToolName,
  description: listSwiftPackageToolDescription,
  schema: listSwiftPackageToolSchema,
  handler: listSwiftPackageToolHandler,
};