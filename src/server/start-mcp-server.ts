#!/usr/bin/env node

/**
 * MCP Server Startup Module
 *
 * This module provides the logic to start the XcodeBuildMCP server.
 * It can be invoked from the CLI via the `mcp` subcommand.
 */

import { createServer, startServer } from './server.ts';
import { log } from '../utils/logger.ts';
import { initSentry } from '../utils/sentry.ts';
import { getDefaultDebuggerManager } from '../utils/debugger/index.ts';
import { version } from '../version.ts';
import process from 'node:process';
import { bootstrapServer } from './bootstrap.ts';

/**
 * Start the MCP server.
 * This function initializes Sentry, creates and bootstraps the server,
 * sets up signal handlers for graceful shutdown, and starts the server.
 */
export async function startMcpServer(): Promise<void> {
  try {
    initSentry();

    const server = createServer();

    await bootstrapServer(server);

    await startServer(server);

    process.on('SIGTERM', async () => {
      await getDefaultDebuggerManager().disposeAll();
      await server.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await getDefaultDebuggerManager().disposeAll();
      await server.close();
      process.exit(0);
    });

    log('info', `XcodeBuildMCP server (version ${version}) started successfully`);
  } catch (error) {
    console.error('Fatal error in startMcpServer():', error);
    process.exit(1);
  }
}
