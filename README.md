# @affectively/aeon-invite

Parent: [Open Source Catalog](../README.md)

## Overview
`@affectively/aeon-invite` is a rollout gate for beta programs and staged launches. It combines:
- invite code lifecycle management
- waitlist queue operations
- access evaluation (admin, beta, redeemed, code)
- funnel event tracking
- React bindings for shielded UI gates

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
- `MemoryInviteStore`: in-memory implementation for tests and local dev.
- `D1InviteStore`: Cloudflare D1 implementation for invite/waitlist/funnel persistence.
- `FetchInviteStore`: browser/client adapter for `/api/invite/*` endpoints.

Schema for D1 is provided at [sql/schema.sql](./sql/schema.sql).

## React Bindings
React entrypoint: `@affectively/aeon-invite/react`

```tsx
import { InviteProvider, BetaShield } from '@affectively/aeon-invite/react';

<InviteProvider manager={manager} context={{ email: 'user@example.com' }}>
  <BetaShield waitlistFallback={<div>Join waitlist</div>}>
    <App />
  </BetaShield>
</InviteProvider>
```

## Notable API
- `generateInviteCode()` and `validateCodeFormat()`
- `joinWaitlist()` and `getWaitlistPosition()`
- `createFunnelEvent()`
- `D1Analytics`, `ConsoleAnalytics`, `BeaconAnalytics`

## Development
```bash
cd open-source/aeon-invite
bun run build
bun test
```

## Subdirectories
- `src/`
- `__tests__/`
- `sql/`
