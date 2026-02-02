/**
 * Shared process state management for Swift Package tools
 * This module provides a centralized way to manage active processes
 * between swift_package_run and swift_package_stop tools
 */

export interface ProcessInfo {
  process: {
    kill: (signal?: string) => void;
    on: (event: string, callback: () => void) => void;
    pid?: number;
  };
  startedAt: Date;
  executableName?: string;
  packagePath?: string;
}

// Global map to track active processes
export const activeProcesses = new Map<number, ProcessInfo>();

// Helper functions for process management
export const getProcess = (pid: number): ProcessInfo | undefined => {
  return activeProcesses.get(pid);
};

export const addProcess = (pid: number, processInfo: ProcessInfo): void => {
  activeProcesses.set(pid, processInfo);
};

export const removeProcess = (pid: number): boolean => {
  return activeProcesses.delete(pid);
};

export const clearAllProcesses = (): void => {
  activeProcesses.clear();
};
