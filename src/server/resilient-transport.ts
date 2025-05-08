/**
 * ResilientStdioTransport - Error-handling wrapper for stdio transport
 * 
 * This class wraps the StdioServerTransport to provide resilient error handling
 * for pipe errors and disconnections. It prevents server crashes due to EPIPE
 * errors when clients disconnect unexpectedly.
 */

import { ServerTransport } from '@modelcontextprotocol/sdk/server/transport.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { log } from '../utils/logger.js';

export class ResilientStdioTransport implements ServerTransport {
  private transport: StdioServerTransport;
  
  constructor() {
    this.transport = new StdioServerTransport();
  }

  onclose?: () => void;
  onmessage?: (message: any) => void;

  async connect(): Promise<void> {
    return this.transport.connect();
  }

  async disconnect(): Promise<void> {
    return this.transport.disconnect();
  }

  private handleDisconnect(reason: string) {
    log('info', reason);
    this.onclose?.();
  }

  async send(message: any): Promise<void> {
    try {
      await this.transport.send(message);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('EPIPE') || 
          error.message.includes('Broken pipe') ||
          error.message.includes('write after end')
        ) {
          this.handleDisconnect(`Client disconnected unexpectedly: ${error.message}`);
        } else {
          log('error', `Transport error: ${error.message}`);
          throw error; // Re-throw non-pipe errors
        }
      }
    }
  }
}