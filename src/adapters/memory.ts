import type {
  InviteStore,
  InviteCode,
  WaitlistEntry,
  WaitlistStatus,
  FunnelEvent,
} from '../types.js';

export class MemoryInviteStore implements InviteStore {
  private codes: Map<string, InviteCode> = new Map();
  private waitlist: Map<string, WaitlistEntry> = new Map();
  private redeemedByUser: Map<string, InviteCode[]> = new Map();
  private static readonly MAX_EVENTS = 10_000;
  private events: FunnelEvent[] = [];

  async getInviteCode(code: string): Promise<InviteCode | null> {
    return this.codes.get(code) ?? null;
  }

  async createInviteCode(invite: InviteCode): Promise<void> {
    this.codes.set(invite.code, { ...invite });
  }

  async incrementCodeUses(code: string): Promise<void> {
    const invite = this.codes.get(code);
    if (invite) {
      invite.currentUses += 1;
      if (
        invite.maxUses !== undefined &&
        invite.currentUses >= invite.maxUses
      ) {
        invite.status = 'exhausted';
      }
    }
  }

  async getRedeemedCodes(userId: string): Promise<InviteCode[]> {
    return this.redeemedByUser.get(userId) ?? [];
  }

  async getWaitlistEntry(email: string): Promise<WaitlistEntry | null> {
    return this.waitlist.get(email) ?? null;
  }

  async addWaitlistEntry(entry: WaitlistEntry): Promise<void> {
    this.waitlist.set(entry.email, { ...entry });
  }

  async getWaitlistCount(): Promise<number> {
    return this.waitlist.size;
  }

  async updateWaitlistStatus(
    email: string,
    status: WaitlistStatus,
    invitedAt?: string
  ): Promise<void> {
    const entry = this.waitlist.get(email);
    if (entry) {
      entry.status = status;
      if (invitedAt) entry.invitedAt = invitedAt;
    }
  }

  async recordFunnelEvent(event: FunnelEvent): Promise<void> {
    this.events.push({ ...event });
    if (this.events.length > MemoryInviteStore.MAX_EVENTS) {
      this.events = this.events.slice(-MemoryInviteStore.MAX_EVENTS);
    }
  }

  // Test helpers
  getEvents(): FunnelEvent[] {
    return [...this.events];
  }

  addRedeemedCode(userId: string, code: InviteCode): void {
    const existing = this.redeemedByUser.get(userId) ?? [];
    existing.push(code);
    this.redeemedByUser.set(userId, existing);
  }
}
