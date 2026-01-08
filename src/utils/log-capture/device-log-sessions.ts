import type { ChildProcess } from 'child_process';
import type * as fs from 'fs';

export interface DeviceLogSession {
  process: ChildProcess;
  logFilePath: string;
  deviceUuid: string;
  bundleId: string;
  logStream?: fs.WriteStream;
  hasEnded: boolean;
}

export const activeDeviceLogSessions = new Map<string, DeviceLogSession>();
