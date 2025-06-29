import {
  buildDevWsName,
  buildDevWsDescription,
  buildDevWsSchema,
  buildDevWsHandler,
} from '../../src/tools/build-ios-device/index.js';

export default {
  name: buildDevWsName,
  description: buildDevWsDescription,
  schema: buildDevWsSchema,
  handler: buildDevWsHandler,
};