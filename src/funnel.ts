import type { FunnelEvent, FunnelEventType, FunnelAnalytics } from './types.js';

export function createFunnelEvent(
  event: FunnelEventType,
  payload?: Partial<Omit<FunnelEvent, 'event' | 'timestamp'>>
): FunnelEvent {
  return {
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };
}

export class ConsoleAnalytics implements FunnelAnalytics {
  track(event: FunnelEvent): void {
    console.log(`[aeon-invite] ${event.event}`, event);
  }
}

export class BeaconAnalytics implements FunnelAnalytics {
  constructor(private endpoint: string) {}

  track(event: FunnelEvent): void {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, JSON.stringify(event));
    }
  }
}
