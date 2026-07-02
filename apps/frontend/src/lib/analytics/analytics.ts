export type AnalyticsEvent =
  | "app_open"
  | "app_close"
  | "login"
  | "logout"
  | "push_permission_granted"
  | "push_permission_denied"
  | "notification_received"
  | "notification_opened"
  | "deep_link_opened"
  | "webview_error"
  | "offline"
  | "online_again";

export interface AnalyticsProvider {
  track(event: AnalyticsEvent, props?: Record<string, unknown>): void;
}

class NoopAnalyticsProvider implements AnalyticsProvider {
  track(_event: AnalyticsEvent, _props?: Record<string, unknown>) {
    /* no-op até integrar PostHog/Firebase/Amplitude */
  }
}

let provider: AnalyticsProvider = new NoopAnalyticsProvider();

export function setAnalyticsProvider(p: AnalyticsProvider) {
  provider = p;
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  provider.track(event, props);
}
