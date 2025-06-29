import {
  buildMacProjToolName,
  buildMacProjToolDescription,
  buildMacProjToolSchema,
  buildMacProjToolHandler
} from '../../src/tools/build-macos/index.js';

export default {
  name: buildMacProjToolName,
  description: buildMacProjToolDescription,
  schema: buildMacProjToolSchema,
  handler: buildMacProjToolHandler,
};