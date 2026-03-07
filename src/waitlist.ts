import type { InviteStore, WaitlistEntry } from './types.js';

export async function joinWaitlist(
  store: InviteStore,
  email: string,
  source?: string,
  referredBy?: string
): Promise<number> {
  const normalized = email.toLowerCase().trim();
  const existing = await store.getWaitlistEntry(normalized);
  if (existing) {
    return existing.position;
  }

  const count = await store.getWaitlistCount();
  const position = count + 1;

  const entry: WaitlistEntry = {
    email: normalized,
    position,
    status: 'waiting',
    joinedAt: new Date().toISOString(),
    source,
    referredBy,
  };

  await store.addWaitlistEntry(entry);
  return position;
}

export async function getWaitlistPosition(
  store: InviteStore,
  email: string
): Promise<number | null> {
  const entry = await store.getWaitlistEntry(email.toLowerCase().trim());
  return entry?.position ?? null;
}
