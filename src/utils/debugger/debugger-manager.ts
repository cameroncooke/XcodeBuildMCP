import { v4 as uuidv4 } from 'uuid';
import type { DebuggerBackend } from './backends/DebuggerBackend.ts';
import { createDapBackend } from './backends/dap-backend.ts';
import { createLldbCliBackend } from './backends/lldb-cli-backend.ts';
import type {
  BreakpointInfo,
  BreakpointSpec,
  DebugExecutionState,
  DebugSessionInfo,
  DebuggerBackendKind,
} from './types.ts';

export type DebuggerBackendFactory = (kind: DebuggerBackendKind) => Promise<DebuggerBackend>;

export class DebuggerManager {
  private readonly backendFactory: DebuggerBackendFactory;
  private readonly sessions = new Map<
    string,
    { info: DebugSessionInfo; backend: DebuggerBackend }
  >();
  private currentSessionId: string | null = null;

  constructor(options: { backendFactory?: DebuggerBackendFactory } = {}) {
    this.backendFactory = options.backendFactory ?? defaultBackendFactory;
  }

  async createSession(opts: {
    simulatorId: string;
    pid: number;
    backend?: DebuggerBackendKind;
    waitFor?: boolean;
  }): Promise<DebugSessionInfo> {
    const backendKind = resolveBackendKind(opts.backend);
    const backend = await this.backendFactory(backendKind);

    try {
      await backend.attach({ pid: opts.pid, simulatorId: opts.simulatorId, waitFor: opts.waitFor });
    } catch (error) {
      try {
        await backend.dispose();
      } catch {
        // Best-effort cleanup; keep original attach error.
      }
      throw error;
    }

    const now = Date.now();
    const info: DebugSessionInfo = {
      id: uuidv4(),
      backend: backendKind,
      simulatorId: opts.simulatorId,
      pid: opts.pid,
      createdAt: now,
      lastUsedAt: now,
    };

    this.sessions.set(info.id, { info, backend });
    return info;
  }

  getSession(id?: string): { info: DebugSessionInfo; backend: DebuggerBackend } | null {
    const resolvedId = id ?? this.currentSessionId;
    if (!resolvedId) return null;
    return this.sessions.get(resolvedId) ?? null;
  }

  setCurrentSession(id: string): void {
    if (!this.sessions.has(id)) {
      throw new Error(`Debug session not found: ${id}`);
    }
    this.currentSessionId = id;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  listSessions(): DebugSessionInfo[] {
    return Array.from(this.sessions.values()).map((session) => ({ ...session.info }));
  }

  findSessionForSimulator(simulatorId: string): DebugSessionInfo | null {
    if (!simulatorId) return null;
    if (this.currentSessionId) {
      const current = this.sessions.get(this.currentSessionId);
      if (current?.info.simulatorId === simulatorId) {
        return current.info;
      }
    }

    for (const session of this.sessions.values()) {
      if (session.info.simulatorId === simulatorId) {
        return session.info;
      }
    }

    return null;
  }

  async detachSession(id?: string): Promise<void> {
    const session = this.requireSession(id);
    try {
      await session.backend.detach();
    } finally {
      await session.backend.dispose();
      this.sessions.delete(session.info.id);
      if (this.currentSessionId === session.info.id) {
        this.currentSessionId = null;
      }
    }
  }

  async disposeAll(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.sessions.values()).map(async (session) => {
        try {
          await session.backend.detach();
        } catch {
          // Best-effort cleanup; detach can fail if the process exited.
        } finally {
          await session.backend.dispose();
        }
      }),
    );
    this.sessions.clear();
    this.currentSessionId = null;
  }

  async addBreakpoint(
    id: string | undefined,
    spec: BreakpointSpec,
    opts?: { condition?: string },
  ): Promise<BreakpointInfo> {
    const session = this.requireSession(id);
    const result = await session.backend.addBreakpoint(spec, opts);
    this.touch(session.info.id);
    return result;
  }

  async removeBreakpoint(id: string | undefined, breakpointId: number): Promise<string> {
    const session = this.requireSession(id);
    const result = await session.backend.removeBreakpoint(breakpointId);
    this.touch(session.info.id);
    return result;
  }

  async getStack(
    id: string | undefined,
    opts?: { threadIndex?: number; maxFrames?: number },
  ): Promise<string> {
    const session = this.requireSession(id);
    const result = await session.backend.getStack(opts);
    this.touch(session.info.id);
    return result;
  }

  async getVariables(id: string | undefined, opts?: { frameIndex?: number }): Promise<string> {
    const session = this.requireSession(id);
    const result = await session.backend.getVariables(opts);
    this.touch(session.info.id);
    return result;
  }

  async getExecutionState(
    id: string | undefined,
    opts?: { timeoutMs?: number },
  ): Promise<DebugExecutionState> {
    const session = this.requireSession(id);
    const result = await session.backend.getExecutionState(opts);
    this.touch(session.info.id);
    return result;
  }

  async runCommand(
    id: string | undefined,
    command: string,
    opts?: { timeoutMs?: number },
  ): Promise<string> {
    const session = this.requireSession(id);
    const result = await session.backend.runCommand(command, opts);
    this.touch(session.info.id);
    return result;
  }

  async resumeSession(id?: string, opts?: { threadId?: number }): Promise<void> {
    const session = this.requireSession(id);
    await session.backend.resume(opts);
    this.touch(session.info.id);
  }

  private requireSession(id?: string): { info: DebugSessionInfo; backend: DebuggerBackend } {
    const session = this.getSession(id);
    if (!session) {
      throw new Error('No active debug session. Provide debugSessionId or attach first.');
    }
    return session;
  }

  private touch(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.info.lastUsedAt = Date.now();
  }
}

function resolveBackendKind(explicit?: DebuggerBackendKind): DebuggerBackendKind {
  if (explicit) return explicit;
  const envValue = process.env.XCODEBUILDMCP_DEBUGGER_BACKEND;
  if (!envValue) return 'dap';
  const normalized = envValue.trim().toLowerCase();
  if (normalized === 'lldb-cli' || normalized === 'lldb') return 'lldb-cli';
  if (normalized === 'dap') return 'dap';
  throw new Error(`Unsupported debugger backend: ${envValue}`);
}

const defaultBackendFactory: DebuggerBackendFactory = async (kind) => {
  switch (kind) {
    case 'lldb-cli':
      return createLldbCliBackend();
    case 'dap':
      return createDapBackend();
    default:
      throw new Error(`Unsupported debugger backend: ${kind}`);
  }
};
