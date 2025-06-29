/**
 * Plugin: List Schemes Workspace
 * 
 * Lists available schemes in an Xcode workspace using xcodebuild.
 * This tool helps developers discover what schemes are available for building
 * in their workspace, which is essential for subsequent build operations.
 */

import {
  listSchemsWsToolName,
  listSchemsWsToolDescription,
  listSchemsWsToolSchema,
  listSchemsWsToolHandler,
} from '../../src/tools/build-settings/index.js';

export default {
  name: listSchemsWsToolName,
  description: listSchemsWsToolDescription,
  schema: listSchemsWsToolSchema,
  handler: listSchemsWsToolHandler,
};