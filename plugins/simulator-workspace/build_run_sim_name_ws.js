import {
  buildRunSimNameWsToolName,
  buildRunSimNameWsToolDescription,
  buildRunSimNameWsToolSchema,
  buildRunSimNameWsToolHandler
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildRunSimNameWsToolName,
  description: buildRunSimNameWsToolDescription,
  schema: buildRunSimNameWsToolSchema,
  handler: buildRunSimNameWsToolHandler,
};