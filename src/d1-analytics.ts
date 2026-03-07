import type { FunnelEvent, FunnelAnalytics } from './types.js';

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<void>;
}

export class D1Analytics implements FunnelAnalytics {
  constructor(
    private db: D1Database,
    private appName?: string
  ) {}

  track(event: FunnelEvent): void {
    const e = { ...event, app: event.app ?? this.appName };
    this.db
      .prepare(
        `INSERT INTO funnel_events (event, timestamp, user_id, email, invite_code, source, app, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        e.event,
        e.timestamp,
        e.userId ?? null,
        e.email ?? null,
        e.inviteCode ?? null,
        e.source ?? null,
        e.app ?? null,
        e.metadata ? JSON.stringify(e.metadata) : null
      )
      .run()
      .catch((err) => console.error('[aeon-invite] D1Analytics write failed:', err));
  }
}
