#!/usr/bin/env node

/**
 * XcodeBuildMCP Doctor CLI
 *
 * This standalone script runs the doctor tool and outputs the results
 * to the console. It's designed to be run directly via npx or mise.
 */

import { version } from './version.js';
import { doctorLogic } from './mcp/tools/doctor/doctor.js';
import { getDefaultCommandExecutor } from './utils/index.js';

async function runDoctor(): Promise<void> {
  try {
    // Using console.error to avoid linting issues as it's allowed by the project's linting rules
    console.error(`Running XcodeBuildMCP Doctor (v${version})...`);
    console.error('Collecting system information and checking dependencies...\n');

    // Run the doctor tool logic directly with CLI flag enabled
    const executor = getDefaultCommandExecutor();
    const result = await doctorLogic({}, executor, true); // showAsciiLogo = true for CLI

    // Output the doctor information
    if (result.content && result.content.length > 0) {
      const textContent = result.content.find((item) => item.type === 'text');
      if (textContent && textContent.type === 'text') {
        // eslint-disable-next-line no-console
        console.log(textContent.text);
      } else {
        console.error('Error: Unexpected doctor result format');
      }
    } else {
      console.error('Error: No doctor information returned');
    }

    console.error('\nDoctor run complete. Please include this output when reporting issues.');
  } catch (error) {
    console.error('Error running doctor:', error);
    process.exit(1);
  }
}

// Run the doctor
runDoctor().catch((error) => {
  console.error('Unhandled exception:', error);
  process.exit(1);
});
