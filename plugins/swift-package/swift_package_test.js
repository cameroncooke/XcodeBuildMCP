import {
  testSwiftPackageToolName,
  testSwiftPackageToolDescription,
  testSwiftPackageToolSchema,
  testSwiftPackageToolHandler
} from '../../src/tools/test-swift-package/index.js';

export default {
  name: testSwiftPackageToolName,
  description: testSwiftPackageToolDescription,
  schema: testSwiftPackageToolSchema,
  handler: testSwiftPackageToolHandler,
};