import type {
  InviteStore,
  InviteCode,
  WaitlistEntry,
  WaitlistStatus,
  FunnelEvent,
  InviteCodeStatus,
  InviteCodeType,
} from '../types.js';

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<void>;
}

export class D1InviteStore implements InviteStore {
  constructor(private db: D1Database) {}

  async getInviteCode(code: string): Promise<InviteCode | null> {
    const row = await this.db
      .prepare('SELECT * FROM invite_codes WHERE code = ?')
      .bind(code)
      .first<Record<string, unknown>>();

    return row ? this.rowToInviteCode(row) : null;
  }

  async createInviteCode(invite: InviteCode): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO invite_codes (code, type, created_by, created_at, expires_at, max_uses, current_uses, status, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        invite.code,
        invite.type,
        invite.createdBy,
        invite.createdAt,
        invite.expiresAt ?? null,
        invite.maxUses ?? null,
        invite.currentUses,
        invite.status,
        invite.metadata ? JSON.stringify(invite.metadata) : null
      )
      .run();
  }

  async incrementCodeUses(code: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE invite_codes SET current_uses = current_uses + 1,
         status = CASE WHEN max_uses IS NOT NULL AND current_uses + 1 >= max_uses THEN 'exhausted' ELSE status END
         WHERE code = ?`
      )
      .bind(code)
      .run();
  }

  async getRedeemedCodes(userId: string): Promise<InviteCode[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ic.* FROM invite_codes ic
         INNER JOIN funnel_events fe ON fe.invite_code = ic.code
         WHERE fe.user_id = ? AND fe.event = 'invite_redeemed'`
      )
      .bind(userId)
      .all<Record<string, unknown>>();

    return results.map((r) => this.rowToInviteCode(r));
  }

  async getWaitlistEntry(email: string): Promise<WaitlistEntry | null> {
    const row = await this.db
      .prepare('SELECT * FROM waitlist WHERE email = ?')
      .bind(email)
      .first<Record<string, unknown>>();

    return row ? this.rowToWaitlistEntry(row) : null;
  }

  async addWaitlistEntry(entry: WaitlistEntry): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO waitlist (email, position, status, joined_at, invited_at, source, referred_by, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.email,
        entry.position,
        entry.status,
        entry.joinedAt,
        entry.invitedAt ?? null,
        entry.source ?? null,
        entry.referredBy ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      )
      .run();
  }

  async getWaitlistCount(): Promise<number> {
    const row = await this.db
      .prepare('SELECT COUNT(*) as count FROM waitlist')
      .first<{ count: number }>();

    return row?.count ?? 0;
  }

  async updateWaitlistStatus(
    email: string,
    status: WaitlistStatus,
    invitedAt?: string
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE waitlist SET status = ?, invited_at = COALESCE(?, invited_at) WHERE email = ?`
      )
      .bind(status, invitedAt ?? null, email)
      .run();
  }

  async recordFunnelEvent(event: FunnelEvent): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO funnel_events (event, timestamp, user_id, email, invite_code, source, app, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        event.event,
        event.timestamp,
        event.userId ?? null,
        event.email ?? null,
        event.inviteCode ?? null,
        event.source ?? null,
        event.app ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null
      )
      .run();
  }

  private rowToInviteCode(row: Record<string, unknown>): InviteCode {
    return {
      code: row.code as string,
      type: row.type as InviteCodeType,
      createdBy: (row.created_by ?? row.createdBy) as string,
      createdAt: (row.created_at ?? row.createdAt) as string,
      expiresAt: (row.expires_at ?? row.expiresAt) as string | undefined,
      maxUses: (row.max_uses ?? row.maxUses) as number | undefined,
      currentUses: ((row.current_uses ?? row.currentUses) as number) ?? 0,
      status: row.status as InviteCodeStatus,
      metadata: row.metadata
        ? (() => {
            try {
              return JSON.parse(row.metadata as string);
            } catch {
              return undefined;
            }
          })()
        : undefined,
    };
  }

  private rowToWaitlistEntry(row: Record<string, unknown>): WaitlistEntry {
    return {
      email: row.email as string,
      position: row.position as number,
      status: row.status as WaitlistStatus,
      joinedAt: (row.joined_at ?? row.joinedAt) as string,
      invitedAt: (row.invited_at ?? row.invitedAt) as string | undefined,
      source: row.source as string | undefined,
      referredBy: (row.referred_by ?? row.referredBy) as string | undefined,
      metadata: row.metadata
        ? (() => {
            try {
              return JSON.parse(row.metadata as string);
            } catch {
              return undefined;
            }
          })()
        : undefined,
    };
  }
}
