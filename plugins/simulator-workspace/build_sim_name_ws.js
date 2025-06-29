import {
  buildSimNameWsToolName,
  buildSimNameWsToolDescription,
  buildSimNameWsToolSchema,
  buildSimNameWsToolHandler
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildSimNameWsToolName,
  description: buildSimNameWsToolDescription,
  schema: buildSimNameWsToolSchema,
  handler: buildSimNameWsToolHandler,
};