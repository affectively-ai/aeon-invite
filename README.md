# @affectively/aeon-invite

Parent: [Open Source Catalog](../README.md)

`@affectively/aeon-invite` handles invites, waitlists, beta shields, and rollout analytics for staged launches.

The fair brag is that it covers the whole rollout path in one package: code generation, waitlist handling, access evaluation, analytics hooks, storage adapters, and React bindings for gated UI.

## Why People May Like It

- invite code lifecycle management is built in,
- waitlist joins and position checks are part of the same package,
- access evaluation can consider admin, beta, redeemed, and code-based paths,
- analytics hooks exist for funnel tracking,
- and the React surface makes it easy to gate parts of the UI without rewriting the same logic.

## Install

```bash
bun add @affectively/aeon-invite
```

## Quick Start

```ts
import { InviteManager, MemoryInviteStore } from '@affectively/aeon-invite';

const manager = new InviteManager({
  store: new MemoryInviteStore(),
  adminEmails: ['founder@example.com'],
  betaTesterEmails: ['qa@example.com'],
});

const invite = await manager.createInviteCode('direct', 'founder@example.com', {
  maxUses: 100,
});

const gate = await manager.evaluate({
  email: 'user@example.com',
  inviteCode: invite.code,
});
```

## Store Adapters

- `MemoryInviteStore`: in-memory adapter for tests and local work
- `D1InviteStore`: D1-backed persistence
- `FetchInviteStore`: client-side adapter for `/api/invite/*` endpoints

Schema for D1 lives at [sql/schema.sql](./sql/schema.sql).

## React Bindings

React entrypoint: `@affectively/aeon-invite/react`

```tsx
import { InviteProvider, BetaShield } from '@affectively/aeon-invite/react';

<InviteProvider manager={manager} context={{ email: 'user@example.com' }}>
  <BetaShield waitlistFallback={<div>Join waitlist</div>}>
    <App />
  </BetaShield>
</InviteProvider>;
```

## Other Useful Exports

- `generateInviteCode()` and `validateCodeFormat()`
- `joinWaitlist()` and `getWaitlistPosition()`
- `createFunnelEvent()`
- `D1Analytics`, `ConsoleAnalytics`, and `BeaconAnalytics`

## Development

```bash
cd open-source/aeon-invite
bun run build
bun test
```

## Why This README Is Grounded

Aeon Invite does not need inflated language. The strongest fair brag is that it already gives you a practical rollout package instead of forcing you to glue invites, waitlists, analytics, and UI gating together yourself.
