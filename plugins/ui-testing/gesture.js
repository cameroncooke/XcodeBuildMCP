/**
 * Gesture Tool Plugin
 * 
 * Perform gesture on iOS simulator using preset gestures: scroll-up, scroll-down, 
 * scroll-left, scroll-right, swipe-from-left-edge, swipe-from-right-edge, 
 * swipe-from-top-edge, swipe-from-bottom-edge
 */

import {
  gestureToolName,
  gestureToolDescription,
  gestureToolSchema,
  gestureToolHandler,
} from '../../src/tools/axe/index.js';

export default {
  name: gestureToolName,
  description: gestureToolDescription,
  schema: gestureToolSchema,
  handler: gestureToolHandler,
};