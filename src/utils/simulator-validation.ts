import { log } from './logging/index.ts';

/**
 * Logs a warning if useLatestOS is provided with simulatorId.
 *
 * The useLatestOS parameter is ignored when using simulatorId since
 * the UUID already specifies an exact device and OS version. This warning
 * helps users understand that their useLatestOS parameter has no effect.
 *
 * @param simulatorId - Simulator UUID (if provided)
 * @param useLatestOS - Whether to use latest OS (if provided)
 *
 * @example
 * logUseLatestOSWarning('ABC-123-DEF', true);
 * // Logs: "useLatestOS parameter is ignored when using simulatorId (UUID implies exact device/OS)"
 */
export function logUseLatestOSWarning(simulatorId?: string, useLatestOS?: boolean): void {
  if (simulatorId && useLatestOS !== undefined) {
    log(
      'warning',
      'useLatestOS parameter is ignored when using simulatorId (UUID implies exact device/OS)',
    );
  }
}
