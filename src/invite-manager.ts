import type {
  InviteManagerConfig,
  InviteContext,
  ShieldEvaluation,
  InviteCode,
  InviteCodeType,
  FunnelEvent,
  FunnelEventType,
} from './types.js';
import { generateInviteCode, validateCodeFormat } from './code-generator.js';
import { joinWaitlist, getWaitlistPosition } from './waitlist.js';
import { createFunnelEvent } from './funnel.js';

export class InviteManager {
  private store: InviteManagerConfig['store'];
  private analytics: InviteManagerConfig['analytics'];
  private betaTesterEmails: Set<string>;
  private adminEmails: Set<string>;
  private listeners: Set<() => void> = new Set();

  constructor(config: InviteManagerConfig) {
    this.store = config.store;
    this.analytics = config.analytics;
    this.betaTesterEmails = new Set(
      (config.betaTesterEmails ?? []).map((e) => e.toLowerCase().trim())
    );
    this.adminEmails = new Set(
      (config.adminEmails ?? []).map((e) => e.toLowerCase().trim())
    );
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  async evaluate(context: InviteContext): Promise<ShieldEvaluation> {
    const email = context.email?.toLowerCase().trim();

    // 1. Admin email
    if (email && this.adminEmails.has(email)) {
      return { verdict: 'access_granted', method: 'admin' };
    }

    // 2. Beta tester email
    if (email && this.betaTesterEmails.has(email)) {
      return { verdict: 'access_granted', method: 'beta' };
    }

    // 3. Already redeemed invite (by userId)
    if (context.userId) {
      const redeemed = await this.store.getRedeemedCodes(context.userId);
      if (redeemed.length > 0) {
        return { verdict: 'access_granted', method: 'invite' };
      }
    }

    // 4. Valid invite code in context
    if (context.inviteCode && validateCodeFormat(context.inviteCode)) {
      const code = await this.store.getInviteCode(context.inviteCode);
      if (code && this.isCodeUsable(code)) {
        return { verdict: 'access_granted', method: 'code' };
      }
    }

    // 5. Show waitlist
    let waitlistPosition: number | undefined;
    if (email) {
      const pos = await getWaitlistPosition(this.store, email);
      if (pos !== null) {
        waitlistPosition = pos;
      }
    }

    return { verdict: 'show_waitlist', waitlistPosition };
  }

  async createInviteCode(
    type: InviteCodeType,
    createdBy: string,
    opts?: {
      maxUses?: number;
      expiresAt?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<InviteCode> {
    const invite: InviteCode = {
      code: generateInviteCode(),
      type,
      createdBy,
      createdAt: new Date().toISOString(),
      expiresAt: opts?.expiresAt,
      maxUses: opts?.maxUses,
      currentUses: 0,
      status: 'active',
      metadata: opts?.metadata,
    };

    await this.store.createInviteCode(invite);
    this.notify();
    return invite;
  }

  async redeemInviteCode(code: string, userId: string): Promise<boolean> {
    if (!validateCodeFormat(code)) return false;

    const invite = await this.store.getInviteCode(code);
    if (!invite || !this.isCodeUsable(invite)) return false;

    await this.store.incrementCodeUses(code);
    this.trackEvent('invite_redeemed', { userId, inviteCode: code });
    this.notify();
    return true;
  }

  async joinWaitlist(
    email: string,
    source?: string,
    referredBy?: string
  ): Promise<number> {
    const position = await joinWaitlist(this.store, email, source, referredBy);
    this.trackEvent('waitlist_signup', { email, source });
    this.notify();
    return position;
  }

  async getWaitlistPosition(email: string): Promise<number | null> {
    return getWaitlistPosition(this.store, email);
  }

  trackEvent(
    event: FunnelEventType,
    payload?: Partial<Omit<FunnelEvent, 'event' | 'timestamp'>>
  ): void {
    const funnelEvent = createFunnelEvent(event, payload);
    this.analytics?.track(funnelEvent);
    this.store.recordFunnelEvent(funnelEvent).catch(() => {});
  }

  isAdmin(email: string): boolean {
    return this.adminEmails.has(email.toLowerCase().trim());
  }

  isBetaTester(email: string): boolean {
    return this.betaTesterEmails.has(email.toLowerCase().trim());
  }

  private isCodeUsable(code: InviteCode): boolean {
    if (code.status !== 'active') return false;
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return false;
    if (code.maxUses !== undefined && code.currentUses >= code.maxUses)
      return false;
    return true;
  }
}
