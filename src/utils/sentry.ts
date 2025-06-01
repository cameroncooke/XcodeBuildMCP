/**
 * Sentry instrumentation for XcodeBuildMCP
 *
 * This file initializes Sentry as early as possible in the application lifecycle.
 * It should be imported at the top of the main entry point file.
 */

import * as Sentry from '@sentry/node';
import { version } from '../version.js';
import {
  getXcodeInfo,
  getEnvironmentVariables,
  checkBinaryAvailability,
} from '../tools/diagnostic.js';

Sentry.init({
  dsn: 'https://798607831167c7b9fe2f2912f5d3c665@o4509258288332800.ingest.de.sentry.io/4509258293837904',

  // Setting this option to true will send default PII data to Sentry
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  // Set release version to match application version
  release: `xcodebuildmcp@${version}`,

  // Set environment based on NODE_ENV
  environment: process.env.NODE_ENV || 'development',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

// Add additional context that might be helpful for debugging
const tags: Record<string, string> = {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
};

// Only add Xcode Info if it's available
const xcodeInfo = getXcodeInfo();
if ('version' in xcodeInfo) {
  tags.xcodeVersion = xcodeInfo.version;
  tags.xcrunVersion = xcodeInfo.xcrunVersion;
} else {
  tags.xcodeVersion = 'Unknown';
  tags.xcrunVersion = 'Unknown';
}

const envVars = getEnvironmentVariables();
tags.env_XCODEBUILDMCP_DEBUG = envVars.XCODEBUILDMCP_DEBUG || 'false';
tags.env_XCODEMAKE_ENABLED = envVars.INCREMENTAL_BUILDS_ENABLED || 'false';

const miseAvailable = checkBinaryAvailability('mise');
tags.miseAvailable = miseAvailable.available ? 'true' : 'false';
tags.miseVersion = miseAvailable.version || 'Unknown';

const axeAvailable = checkBinaryAvailability('axe');
tags.axeAvailable = axeAvailable.available ? 'true' : 'false';
tags.axeVersion = axeAvailable.version || 'Unknown';

Sentry.setTags(tags);
