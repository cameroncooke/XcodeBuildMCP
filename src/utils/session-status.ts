import { getDefaultDebuggerManager } from './debugger/index.ts';
import { listActiveSimulatorLogSessionIds } from './log-capture/index.ts';
import { activeDeviceLogSessions } from './log-capture/device-log-sessions.ts';

export type SessionRuntimeStatusSnapshot = {
  logging: {
    simulator: { activeSessionIds: string[] };
    device: { activeSessionIds: string[] };
  };
  debug: {
    currentSessionId: string | null;
    sessionIds: string[];
  };
};

export function getSessionRuntimeStatusSnapshot(): SessionRuntimeStatusSnapshot {
  const debuggerManager = getDefaultDebuggerManager();
  const sessionIds = debuggerManager
    .listSessions()
    .map((session) => session.id)
    .sort();

  return {
    logging: {
      simulator: {
        activeSessionIds: listActiveSimulatorLogSessionIds(),
      },
      device: {
        activeSessionIds: Array.from(activeDeviceLogSessions.keys()).sort(),
      },
    },
    debug: {
      currentSessionId: debuggerManager.getCurrentSessionId(),
      sessionIds,
    },
  };
}
