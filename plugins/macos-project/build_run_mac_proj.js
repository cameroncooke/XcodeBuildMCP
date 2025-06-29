import {
  buildRunMacProjToolName,
  buildRunMacProjToolDescription,
  buildRunMacProjToolSchema,
  buildRunMacProjToolHandler
} from '../../src/tools/build-macos/index.js';

export default {
  name: buildRunMacProjToolName,
  description: buildRunMacProjToolDescription,
  schema: buildRunMacProjToolSchema,
  handler: buildRunMacProjToolHandler,
};