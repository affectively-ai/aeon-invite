export type InviteCodeType = 'direct' | 'referral' | 'promo' | 'admin';
export type InviteCodeStatus = 'active' | 'exhausted' | 'expired' | 'revoked';
export type WaitlistStatus = 'waiting' | 'invited' | 'redeemed';
export type ShieldVerdict =
  | 'access_granted'
  | 'show_waitlist'
  | 'show_coming_soon';
export type AccessMethod = 'admin' | 'beta' | 'invite' | 'flag' | 'code';

export interface InviteCode {
  code: string;
  type: InviteCodeType;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
  status: InviteCodeStatus;
  metadata?: Record<string, unknown>;
}

export interface WaitlistEntry {
  email: string;
  position: number;
  status: WaitlistStatus;
  joinedAt: string;
  invitedAt?: string;
  source?: string;
  referredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface ReferralChain {
  referrerEmail: string;
  referredEmail: string;
  inviteCode: string;
  redeemedAt?: string;
}

export type FunnelEventType =
  | 'shield_impression'
  | 'waitlist_signup'
  | 'invite_sent'
  | 'invite_redeemed'
  | 'access_granted'
  | 'first_action';

export interface FunnelEvent {
  event: FunnelEventType;
  timestamp: string;
  userId?: string;
  email?: string;
  inviteCode?: string;
  source?: string;
  app?: string;
  metadata?: Record<string, unknown>;
}

export interface InviteContext {
  email?: string;
  userId?: string;
  inviteCode?: string;
}

export interface ShieldEvaluation {
  verdict: ShieldVerdict;
  method?: AccessMethod;
  waitlistPosition?: number;
}

export interface InviteStore {
  getInviteCode(code: string): Promise<InviteCode | null>;
  createInviteCode(invite: InviteCode): Promise<void>;
  incrementCodeUses(code: string): Promise<void>;
  getRedeemedCodes(userId: string): Promise<InviteCode[]>;

  getWaitlistEntry(email: string): Promise<WaitlistEntry | null>;
  addWaitlistEntry(entry: WaitlistEntry): Promise<void>;
  getWaitlistCount(): Promise<number>;
  updateWaitlistStatus(
    email: string,
    status: WaitlistStatus,
    invitedAt?: string
  ): Promise<void>;

  recordFunnelEvent(event: FunnelEvent): Promise<void>;
}

export interface FunnelAnalytics {
  track(event: FunnelEvent): void;
}

export interface InviteManagerConfig {
  store: InviteStore;
  analytics?: FunnelAnalytics;
  betaTesterEmails?: string[];
  adminEmails?: string[];
}
