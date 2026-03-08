import type {
  InviteStore,
  InviteCode,
  WaitlistEntry,
  WaitlistStatus,
  FunnelEvent,
} from '../types.js';

/**
 * Client-side InviteStore that delegates to worker API routes.
 * Points to /api/invite/* endpoints on the same origin.
 */
export class FetchInviteStore implements InviteStore {
  constructor(private baseUrl = '') {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/invite${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Invite API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/invite${path}`);
    if (!res.ok) {
      throw new Error(`Invite API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async getInviteCode(code: string): Promise<InviteCode | null> {
    try {
      return await this.get<InviteCode | null>(
        `/code?code=${encodeURIComponent(code)}`
      );
    } catch {
      return null;
    }
  }

  async createInviteCode(invite: InviteCode): Promise<void> {
    await this.post('/code', invite);
  }

  async incrementCodeUses(code: string): Promise<void> {
    await this.post('/code/increment', { code });
  }

  async getRedeemedCodes(userId: string): Promise<InviteCode[]> {
    try {
      const result = await this.get<{ codes: InviteCode[] }>(
        `/redeemed?userId=${encodeURIComponent(userId)}`
      );
      return result.codes;
    } catch {
      return [];
    }
  }

  async getWaitlistEntry(email: string): Promise<WaitlistEntry | null> {
    try {
      return await this.get<WaitlistEntry | null>(
        `/waitlist/entry?email=${encodeURIComponent(email)}`
      );
    } catch {
      return null;
    }
  }

  async addWaitlistEntry(entry: WaitlistEntry): Promise<void> {
    await this.post('/waitlist', entry);
  }

  async getWaitlistCount(): Promise<number> {
    try {
      const result = await this.get<{ count: number }>('/waitlist/count');
      return result.count;
    } catch {
      return 0;
    }
  }

  async updateWaitlistStatus(
    email: string,
    status: WaitlistStatus,
    invitedAt?: string
  ): Promise<void> {
    await this.post('/waitlist/status', { email, status, invitedAt });
  }

  async recordFunnelEvent(event: FunnelEvent): Promise<void> {
    await this.post('/events', event).catch(() => {
      // Fire-and-forget for analytics
    });
  }
}
