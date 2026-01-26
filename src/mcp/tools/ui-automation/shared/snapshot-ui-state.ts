const SNAPSHOT_UI_WARNING_TIMEOUT_MS = 60000; // 60 seconds

const snapshotUiTimestamps = new Map<string, number>();

export function recordSnapshotUiCall(simulatorId: string): void {
  snapshotUiTimestamps.set(simulatorId, Date.now());
}

export function getSnapshotUiWarning(simulatorId: string): string | null {
  const timestamp = snapshotUiTimestamps.get(simulatorId);
  if (!timestamp) {
    return 'Warning: snapshot_ui has not been called yet. Consider using snapshot_ui for precise coordinates instead of guessing from screenshots.';
  }

  const timeSinceDescribe = Date.now() - timestamp;
  if (timeSinceDescribe > SNAPSHOT_UI_WARNING_TIMEOUT_MS) {
    const secondsAgo = Math.round(timeSinceDescribe / 1000);
    return `Warning: snapshot_ui was last called ${secondsAgo} seconds ago. Consider refreshing UI coordinates with snapshot_ui instead of using potentially stale coordinates.`;
  }

  return null;
}
