export type ToolEvent =
  | {
      name: "tool_used";
      toolId: string;
      action: string;
      value?: number;
    }
  | {
      name: "tool_handoff";
      toolId: string;
      action: "open_submitter";
      value: number;
    }
  | {
      name: "indexnow_submission";
      action: "success" | "error";
      value: number;
    };

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  plausible?: (name: string, options?: Record<string, unknown>) => void;
};

/**
 * Records only coarse product interactions. Callers must never include URLs,
 * hosts, keys, filenames, or uploaded content in event fields.
 */
export function trackEvent(event: ToolEvent): void {
  if (typeof window === "undefined") return;

  const analyticsWindow = window as AnalyticsWindow;
  const toolId = "toolId" in event ? event.toolId : "indexnow";
  analyticsWindow.gtag?.("event", event.name, {
    event_category: toolId,
    event_label: event.action,
    value: event.value,
  });
  analyticsWindow.plausible?.(event.name, {
    props: {
      tool: toolId,
      action: event.action,
      value: event.value,
    },
  });
}
