import {
  runSwiftPackageToolName,
  runSwiftPackageToolDescription,
  runSwiftPackageToolSchema,
  runSwiftPackageToolHandler
} from '../../src/tools/run-swift-package/index.js';

export default {
  name: runSwiftPackageToolName,
  description: runSwiftPackageToolDescription,
  schema: runSwiftPackageToolSchema,
  handler: runSwiftPackageToolHandler,
};