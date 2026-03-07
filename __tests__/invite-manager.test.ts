import { describe, it, expect } from 'bun:test';
import { InviteManager } from '../src/invite-manager.js';
import { MemoryInviteStore } from '../src/adapters/memory.js';
import type { InviteCode } from '../src/types.js';

function createManager(opts?: {
  adminEmails?: string[];
  betaTesterEmails?: string[];
}) {
  const store = new MemoryInviteStore();
  return {
    manager: new InviteManager({
      store,
      adminEmails: opts?.adminEmails ?? ['admin@test.com'],
      betaTesterEmails: opts?.betaTesterEmails ?? ['beta@test.com'],
    }),
    store,
  };
}

describe('InviteManager', () => {
  it('should grant access to admin emails', async () => {
    const { manager } = createManager();
    const result = await manager.evaluate({ email: 'admin@test.com' });
    expect(result.verdict).toBe('access_granted');
    expect(result.method).toBe('admin');
  });

  it('should grant access to admin emails case-insensitively', async () => {
    const { manager } = createManager();
    const result = await manager.evaluate({ email: 'ADMIN@TEST.COM' });
    expect(result.verdict).toBe('access_granted');
    expect(result.method).toBe('admin');
  });

  it('should grant access to beta tester emails', async () => {
    const { manager } = createManager();
    const result = await manager.evaluate({ email: 'beta@test.com' });
    expect(result.verdict).toBe('access_granted');
    expect(result.method).toBe('beta');
  });

  it('should show waitlist for unknown emails', async () => {
    const { manager } = createManager();
    const result = await manager.evaluate({ email: 'nobody@test.com' });
    expect(result.verdict).toBe('show_waitlist');
  });

  it('should show waitlist when no context provided', async () => {
    const { manager } = createManager();
    const result = await manager.evaluate({});
    expect(result.verdict).toBe('show_waitlist');
  });

  it('should grant access when user has redeemed codes', async () => {
    const { manager, store } = createManager();
    const code: InviteCode = {
      code: 'AEON-TEST-CODE',
      type: 'direct',
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      currentUses: 1,
      status: 'active',
    };
    store.addRedeemedCode('user-123', code);

    const result = await manager.evaluate({ userId: 'user-123' });
    expect(result.verdict).toBe('access_granted');
    expect(result.method).toBe('invite');
  });

  it('should grant access for valid invite code in context', async () => {
    const { manager, store } = createManager();
    const code: InviteCode = {
      code: 'AEON-ABCD-EFGH',
      type: 'direct',
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      currentUses: 0,
      status: 'active',
    };
    await store.createInviteCode(code);

    const result = await manager.evaluate({ inviteCode: 'AEON-ABCD-EFGH' });
    expect(result.verdict).toBe('access_granted');
    expect(result.method).toBe('code');
  });

  it('should reject expired invite codes', async () => {
    const { manager, store } = createManager();
    const code: InviteCode = {
      code: 'AEON-ABCD-EFGH',
      type: 'direct',
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      expiresAt: '2020-01-01T00:00:00Z',
      currentUses: 0,
      status: 'active',
    };
    await store.createInviteCode(code);

    const result = await manager.evaluate({ inviteCode: 'AEON-ABCD-EFGH' });
    expect(result.verdict).toBe('show_waitlist');
  });

  it('should reject exhausted invite codes', async () => {
    const { manager, store } = createManager();
    const code: InviteCode = {
      code: 'AEON-ABCD-EFGH',
      type: 'direct',
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      maxUses: 1,
      currentUses: 1,
      status: 'exhausted',
    };
    await store.createInviteCode(code);

    const result = await manager.evaluate({ inviteCode: 'AEON-ABCD-EFGH' });
    expect(result.verdict).toBe('show_waitlist');
  });

  it('should reject invalid code format', async () => {
    const { manager } = createManager();
    const result = await manager.evaluate({ inviteCode: 'invalid-code' });
    expect(result.verdict).toBe('show_waitlist');
  });

  it('should create invite codes', async () => {
    const { manager, store } = createManager();
    const invite = await manager.createInviteCode('direct', 'admin@test.com');
    expect(invite.code).toMatch(/^AEON-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(invite.type).toBe('direct');
    expect(invite.currentUses).toBe(0);
    expect(invite.status).toBe('active');

    const stored = await store.getInviteCode(invite.code);
    expect(stored).not.toBeNull();
  });

  it('should redeem invite codes', async () => {
    const { manager, store } = createManager();
    const invite = await manager.createInviteCode('direct', 'admin@test.com', {
      maxUses: 5,
    });

    const result = await manager.redeemInviteCode(invite.code, 'user-1');
    expect(result).toBe(true);

    const stored = await store.getInviteCode(invite.code);
    expect(stored!.currentUses).toBe(1);
  });

  it('should not redeem invalid codes', async () => {
    const { manager } = createManager();
    const result = await manager.redeemInviteCode('bad-code', 'user-1');
    expect(result).toBe(false);
  });

  it('should join waitlist and return position', async () => {
    const { manager } = createManager();
    const pos1 = await manager.joinWaitlist('first@test.com');
    const pos2 = await manager.joinWaitlist('second@test.com');
    expect(pos1).toBe(1);
    expect(pos2).toBe(2);
  });

  it('should deduplicate waitlist entries', async () => {
    const { manager } = createManager();
    const pos1 = await manager.joinWaitlist('dupe@test.com');
    const pos2 = await manager.joinWaitlist('dupe@test.com');
    expect(pos1).toBe(pos2);
  });

  it('should return waitlist position for known emails', async () => {
    const { manager } = createManager();
    await manager.joinWaitlist('known@test.com');
    const pos = await manager.getWaitlistPosition('known@test.com');
    expect(pos).toBe(1);
  });

  it('should return null position for unknown emails', async () => {
    const { manager } = createManager();
    const pos = await manager.getWaitlistPosition('unknown@test.com');
    expect(pos).toBeNull();
  });

  it('should include waitlist position in evaluation', async () => {
    const { manager } = createManager();
    await manager.joinWaitlist('queued@test.com');
    const result = await manager.evaluate({ email: 'queued@test.com' });
    expect(result.verdict).toBe('show_waitlist');
    expect(result.waitlistPosition).toBe(1);
  });

  it('should track funnel events', async () => {
    const store = new MemoryInviteStore();
    const manager = new InviteManager({ store });
    manager.trackEvent('shield_impression', { app: 'edge-web-app' });
    // Give async store.recordFunnelEvent time to resolve
    await new Promise((r) => setTimeout(r, 10));
    const events = store.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].event).toBe('shield_impression');
    expect(events[0].app).toBe('edge-web-app');
  });

  it('should notify subscribers on code creation', async () => {
    const { manager } = createManager();
    let notified = false;
    manager.subscribe(() => {
      notified = true;
    });
    await manager.createInviteCode('direct', 'admin');
    expect(notified).toBe(true);
  });

  it('should check admin and beta tester status', () => {
    const { manager } = createManager();
    expect(manager.isAdmin('admin@test.com')).toBe(true);
    expect(manager.isAdmin('nobody@test.com')).toBe(false);
    expect(manager.isBetaTester('beta@test.com')).toBe(true);
    expect(manager.isBetaTester('nobody@test.com')).toBe(false);
  });

  it('should prioritize admin over beta', async () => {
    const { manager } = createManager({
      adminEmails: ['both@test.com'],
      betaTesterEmails: ['both@test.com'],
    });
    const result = await manager.evaluate({ email: 'both@test.com' });
    expect(result.method).toBe('admin');
  });
});
