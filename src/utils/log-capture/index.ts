import { activeLogSessions, startLogCapture, stopLogCapture } from '../log_capture.ts';

export function listActiveSimulatorLogSessionIds(): string[] {
  return Array.from(activeLogSessions.keys()).sort();
}

export { startLogCapture, stopLogCapture };
