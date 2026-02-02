import net from 'node:net';
import { writeFrame, createFrameReader } from './framing.ts';
import type { ToolCatalog } from '../runtime/types.ts';
import type {
  DaemonRequest,
  DaemonResponse,
  ToolInvokeParams,
  DaemonStatusResult,
  ToolListItem,
} from './protocol.ts';
import { DAEMON_PROTOCOL_VERSION } from './protocol.ts';
import { DefaultToolInvoker } from '../runtime/tool-invoker.ts';
import { log } from '../utils/logger.ts';

export interface DaemonServerContext {
  socketPath: string;
  logPath?: string;
  startedAt: string;
  enabledWorkflows: string[];
  catalog: ToolCatalog;
  workspaceRoot: string;
  workspaceKey: string;
  /** Callback to request graceful shutdown (used instead of direct process.exit) */
  requestShutdown: () => void;
}

/**
 * Start the daemon server listening on a Unix domain socket.
 */
export function startDaemonServer(ctx: DaemonServerContext): net.Server {
  const invoker = new DefaultToolInvoker(ctx.catalog);

  const server = net.createServer((socket) => {
    log('info', '[Daemon] Client connected');

    const onData = createFrameReader(
      async (msg) => {
        const req = msg as DaemonRequest;
        const base: Pick<DaemonResponse, 'v' | 'id'> = {
          v: DAEMON_PROTOCOL_VERSION,
          id: req?.id ?? 'unknown',
        };

        try {
          if (!req || typeof req !== 'object') {
            return writeFrame(socket, {
              ...base,
              error: { code: 'BAD_REQUEST', message: 'Invalid request format' },
            });
          }

          if (req.v !== DAEMON_PROTOCOL_VERSION) {
            return writeFrame(socket, {
              ...base,
              error: {
                code: 'BAD_REQUEST',
                message: `Unsupported protocol version: ${req.v}`,
              },
            });
          }

          switch (req.method) {
            case 'daemon.status': {
              const result: DaemonStatusResult = {
                pid: process.pid,
                socketPath: ctx.socketPath,
                logPath: ctx.logPath,
                startedAt: ctx.startedAt,
                enabledWorkflows: ctx.enabledWorkflows,
                toolCount: ctx.catalog.tools.length,
                workspaceRoot: ctx.workspaceRoot,
                workspaceKey: ctx.workspaceKey,
              };
              return writeFrame(socket, { ...base, result });
            }

            case 'daemon.stop': {
              log('info', '[Daemon] Stop requested');
              // Send response before initiating shutdown
              writeFrame(socket, { ...base, result: { ok: true } });
              // Request shutdown through callback (allows proper cleanup)
              setTimeout(() => ctx.requestShutdown(), 100);
              return;
            }

            case 'tool.list': {
              const result: ToolListItem[] = ctx.catalog.tools.map((t) => ({
                name: t.cliName,
                workflow: t.workflow,
                description: t.description ?? '',
                stateful: t.stateful,
              }));
              return writeFrame(socket, { ...base, result });
            }

            case 'tool.invoke': {
              const params = req.params as ToolInvokeParams;
              if (!params?.tool) {
                return writeFrame(socket, {
                  ...base,
                  error: { code: 'BAD_REQUEST', message: 'Missing tool parameter' },
                });
              }

              log('info', `[Daemon] Invoking tool: ${params.tool}`);
              const response = await invoker.invoke(params.tool, params.args ?? {}, {
                runtime: 'daemon',
                enabledWorkflows: ctx.enabledWorkflows,
              });

              return writeFrame(socket, { ...base, result: { response } });
            }

            default:
              return writeFrame(socket, {
                ...base,
                error: { code: 'BAD_REQUEST', message: `Unknown method: ${req.method}` },
              });
          }
        } catch (error) {
          log('error', `[Daemon] Error handling request: ${error}`);
          return writeFrame(socket, {
            ...base,
            error: {
              code: 'INTERNAL',
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      },
      (err) => {
        log('error', `[Daemon] Frame parse error: ${err.message}`);
      },
    );

    socket.on('data', onData);
    socket.on('close', () => {
      log('info', '[Daemon] Client disconnected');
    });
    socket.on('error', (err) => {
      log('error', `[Daemon] Socket error: ${err.message}`);
    });
  });

  server.on('error', (err) => {
    log('error', `[Daemon] Server error: ${err.message}`);
  });

  return server;
}
