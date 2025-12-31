export type RuntimeToolInfo =
  | {
      mode: 'runtime';
      enabledWorkflows: string[];
      enabledTools: string[];
      totalRegistered: number;
    }
  | {
      mode: 'static';
      enabledWorkflows: string[];
      enabledTools: string[];
      totalRegistered: number;
      note: string;
    };

let runtimeToolInfo: RuntimeToolInfo | null = null;

export function recordRuntimeRegistration(info: {
  enabledWorkflows: string[];
  enabledTools: string[];
}): void {
  const enabledWorkflows = [...new Set(info.enabledWorkflows)];
  const enabledTools = [...new Set(info.enabledTools)];

  runtimeToolInfo = {
    mode: 'runtime',
    enabledWorkflows,
    enabledTools,
    totalRegistered: enabledTools.length,
  };
}

export function getRuntimeRegistration(): RuntimeToolInfo | null {
  return runtimeToolInfo;
}
