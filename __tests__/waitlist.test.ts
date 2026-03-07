import { describe, it, expect } from 'bun:test';
import { joinWaitlist, getWaitlistPosition } from '../src/waitlist.js';
import { MemoryInviteStore } from '../src/adapters/memory.js';

describe('waitlist', () => {
  it('should add entries with sequential positions', async () => {
    const store = new MemoryInviteStore();
    const pos1 = await joinWaitlist(store, 'first@test.com');
    const pos2 = await joinWaitlist(store, 'second@test.com');
    const pos3 = await joinWaitlist(store, 'third@test.com');
    expect(pos1).toBe(1);
    expect(pos2).toBe(2);
    expect(pos3).toBe(3);
  });

  it('should normalize emails to lowercase', async () => {
    const store = new MemoryInviteStore();
    const pos1 = await joinWaitlist(store, 'Test@Example.COM');
    const pos2 = await joinWaitlist(store, 'test@example.com');
    expect(pos1).toBe(pos2);
  });

  it('should trim whitespace from emails', async () => {
    const store = new MemoryInviteStore();
    const pos1 = await joinWaitlist(store, '  user@test.com  ');
    const pos2 = await joinWaitlist(store, 'user@test.com');
    expect(pos1).toBe(pos2);
  });

  it('should return existing position for duplicate signups', async () => {
    const store = new MemoryInviteStore();
    const pos1 = await joinWaitlist(store, 'dupe@test.com');
    const pos2 = await joinWaitlist(store, 'dupe@test.com');
    expect(pos1).toBe(1);
    expect(pos2).toBe(1);
  });

  it('should store source and referral info', async () => {
    const store = new MemoryInviteStore();
    await joinWaitlist(store, 'ref@test.com', 'homepage', 'referrer@test.com');
    const entry = await store.getWaitlistEntry('ref@test.com');
    expect(entry).not.toBeNull();
    expect(entry!.source).toBe('homepage');
    expect(entry!.referredBy).toBe('referrer@test.com');
  });

  it('should get position for known email', async () => {
    const store = new MemoryInviteStore();
    await joinWaitlist(store, 'known@test.com');
    const pos = await getWaitlistPosition(store, 'known@test.com');
    expect(pos).toBe(1);
  });

  it('should return null for unknown email', async () => {
    const store = new MemoryInviteStore();
    const pos = await getWaitlistPosition(store, 'unknown@test.com');
    expect(pos).toBeNull();
  });
});
