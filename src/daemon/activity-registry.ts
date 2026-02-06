const activityCounts = new Map<string, number>();

function normalizeActivityKey(activityKey: string): string {
  return activityKey.trim();
}

function incrementActivity(activityKey: string): void {
  const current = activityCounts.get(activityKey) ?? 0;
  activityCounts.set(activityKey, current + 1);
}

function decrementActivity(activityKey: string): void {
  const current = activityCounts.get(activityKey) ?? 0;
  if (current <= 1) {
    activityCounts.delete(activityKey);
    return;
  }
  activityCounts.set(activityKey, current - 1);
}

/**
 * Acquire a long-running daemon activity lease.
 * Call the returned release function once the activity has finished.
 */
export function acquireDaemonActivity(activityKey: string): () => void {
  const normalizedKey = normalizeActivityKey(activityKey);
  if (!normalizedKey) {
    throw new Error('activityKey must be a non-empty string');
  }

  incrementActivity(normalizedKey);

  let released = false;
  return (): void => {
    if (released) {
      return;
    }
    released = true;
    decrementActivity(normalizedKey);
  };
}

export interface DaemonActivitySnapshot {
  activeOperationCount: number;
  byCategory: Record<string, number>;
}

export function getDaemonActivitySnapshot(): DaemonActivitySnapshot {
  const byCategory = Object.fromEntries(
    Array.from(activityCounts.entries()).sort(([left], [right]) => left.localeCompare(right)),
  );
  const activeOperationCount = Array.from(activityCounts.values()).reduce(
    (accumulator, count) => accumulator + count,
    0,
  );
  return {
    activeOperationCount,
    byCategory,
  };
}

/**
 * Test helper to reset shared process-local activity state.
 */
export function clearDaemonActivityRegistry(): void {
  activityCounts.clear();
}
