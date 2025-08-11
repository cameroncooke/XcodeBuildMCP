/**
 * Sentry instrumentation for XcodeBuildMCP
 *
 * This file initializes Sentry as early as possible in the application lifecycle.
 * It should be imported at the top of the main entry point file.
 */

import * as Sentry from '@sentry/node';
import { version } from '../version.js';
import { execSync } from 'child_process';

// Inlined system info functions to avoid circular dependencies
function getXcodeInfo(): { version: string; path: string; selectedXcode: string; error?: string } {
  try {
    const xcodebuildOutput = execSync('xcodebuild -version', { encoding: 'utf8' }).trim();
    const version = xcodebuildOutput.split('\n').slice(0, 2).join(' - ');
    const path = execSync('xcode-select -p', { encoding: 'utf8' }).trim();
    const selectedXcode = execSync('xcrun --find xcodebuild', { encoding: 'utf8' }).trim();

    return { version, path, selectedXcode };
  } catch (error) {
    return {
      version: 'Not available',
      path: 'Not available',
      selectedXcode: 'Not available',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getEnvironmentVariables(): Record<string, string> {
  const relevantVars = [
    'XCODEBUILDMCP_DEBUG',
    'INCREMENTAL_BUILDS_ENABLED',
    'XCODEBUILDMCP_DYNAMIC_TOOLS',
    'PATH',
    'DEVELOPER_DIR',
    'HOME',
    'USER',
    'TMPDIR',
    'NODE_ENV',
    'SENTRY_DISABLED',
  ];

  const envVars: Record<string, string> = {};
  relevantVars.forEach((varName) => {
    envVars[varName] = process.env[varName] ?? '';
  });

  return envVars;
}

function checkBinaryAvailability(binary: string): { available: boolean; version?: string } {
  try {
    execSync(`which ${binary}`, { stdio: 'ignore' });
  } catch {
    return { available: false };
  }

  let version: string | undefined;
  const versionCommands: Record<string, string> = {
    axe: 'axe --version',
    mise: 'mise --version',
  };

  if (binary in versionCommands) {
    try {
      version = execSync(versionCommands[binary], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      // Version command failed, but binary exists
    }
  }

  return { available: true, version };
}

Sentry.init({
  dsn: 'https://798607831167c7b9fe2f2912f5d3c665@o4509258288332800.ingest.de.sentry.io/4509258293837904',

  // Setting this option to true will send default PII data to Sentry
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  // Set release version to match application version
  release: `xcodebuildmcp@${version}`,

  // Set environment based on NODE_ENV
  environment: process.env.NODE_ENV ?? 'development',

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
if (!xcodeInfo.error) {
  tags.xcodeVersion = xcodeInfo.version;
  tags.xcodePath = xcodeInfo.path;
} else {
  tags.xcodeVersion = 'Unknown';
  tags.xcodePath = 'Unknown';
}

const envVars = getEnvironmentVariables();
tags.env_XCODEBUILDMCP_DEBUG = envVars['XCODEBUILDMCP_DEBUG'] ?? 'false';
tags.env_XCODEMAKE_ENABLED = envVars['INCREMENTAL_BUILDS_ENABLED'] ?? 'false';

const miseAvailable = checkBinaryAvailability('mise');
tags.miseAvailable = miseAvailable.available ? 'true' : 'false';
tags.miseVersion = miseAvailable.version ?? 'Unknown';

const axeAvailable = checkBinaryAvailability('axe');
tags.axeAvailable = axeAvailable.available ? 'true' : 'false';
tags.axeVersion = axeAvailable.version ?? 'Unknown';

Sentry.setTags(tags);
