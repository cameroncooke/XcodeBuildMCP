#!/usr/bin/env node

/**
 * MCP Server Startup Module
 *
 * This module provides the logic to start the XcodeBuildMCP server.
 * It can be invoked from the CLI via the `mcp` subcommand.
 */

import { createServer, startServer } from './server.ts';
import { log, setLogLevel } from '../utils/logger.ts';
import { flushAndCloseSentry, initSentry } from '../utils/sentry.ts';
import { getDefaultDebuggerManager } from '../utils/debugger/index.ts';
import { version } from '../version.ts';
import process from 'node:process';
import { bootstrapServer } from './bootstrap.ts';
import { shutdownXcodeToolsBridge } from '../integrations/xcode-tools-bridge/index.ts';

/**
 * Start the MCP server.
 * This function initializes Sentry, creates and bootstraps the server,
 * sets up signal handlers for graceful shutdown, and starts the server.
 */
export async function startMcpServer(): Promise<void> {
  try {
    // MCP mode defaults to info level logging
    // Clients can override via logging/setLevel MCP request
    setLogLevel('info');

    initSentry({ mode: 'mcp' });

    const server = createServer();

    await bootstrapServer(server);

    await startServer(server);

    let shuttingDown = false;
    const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
      if (shuttingDown) return;
      shuttingDown = true;

      log('info', `Received ${signal}; shutting down MCP server`);

      let exitCode = 0;

      try {
        await shutdownXcodeToolsBridge();
      } catch (error) {
        exitCode = 1;
        log('error', `Failed to shutdown Xcode tools bridge: ${String(error)}`, { sentry: true });
      }

      try {
        await getDefaultDebuggerManager().disposeAll();
      } catch (error) {
        exitCode = 1;
        log('error', `Failed to dispose debugger sessions: ${String(error)}`, { sentry: true });
      }

      try {
        await server.close();
      } catch (error) {
        exitCode = 1;
        log('error', `Failed to close MCP server: ${String(error)}`, { sentry: true });
      }

      await flushAndCloseSentry(2000);
      process.exit(exitCode);
    };

    process.once('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    process.once('SIGINT', () => {
      void shutdown('SIGINT');
    });

    log('info', `XcodeBuildMCP server (version ${version}) started successfully`);
  } catch (error) {
    log('error', `Fatal error in startMcpServer(): ${String(error)}`, { sentry: true });
    console.error('Fatal error in startMcpServer():', error);
    await flushAndCloseSentry(2000);
    process.exit(1);
  }
}
