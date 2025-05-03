/**
 * Sentry instrumentation for XcodeBuildMCP
 *
 * This file initializes Sentry as early as possible in the application lifecycle.
 * It should be imported at the top of the main entry point file.
 */

import * as Sentry from '@sentry/node';
import { version } from './version.js';

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
Sentry.setTags({
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
});
