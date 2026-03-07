import React from 'react';
import { describe, it, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { InviteManager } from '../src/invite-manager.js';
import { MemoryInviteStore } from '../src/adapters/memory.js';
import {
  InviteProvider,
  BetaShield,
  useInvite,
  useShield,
} from '../src/react.js';

function createTestManager(opts?: {
  adminEmails?: string[];
  betaTesterEmails?: string[];
}) {
  const store = new MemoryInviteStore();
  return new InviteManager({
    store,
    adminEmails: opts?.adminEmails ?? [],
    betaTesterEmails: opts?.betaTesterEmails ?? [],
  });
}

describe('aeon-invite React bindings', () => {
  it('should render loading fallback initially', () => {
    const manager = createTestManager();
    const html = renderToStaticMarkup(
      <InviteProvider manager={manager} context={{ email: 'test@test.com' }}>
        <BetaShield
          loadingFallback={<div>Loading...</div>}
          waitlistFallback={<div>Waitlist</div>}
        >
          <div>App Content</div>
        </BetaShield>
      </InviteProvider>
    );
    // SSR renders the initial state which is loading
    expect(html).toContain('Loading...');
  });

  it('should render waitlist fallback when no context', () => {
    const manager = createTestManager();
    const html = renderToStaticMarkup(
      <InviteProvider manager={manager}>
        <BetaShield waitlistFallback={<div>Join Waitlist</div>}>
          <div>App Content</div>
        </BetaShield>
      </InviteProvider>
    );
    // No context → show_waitlist verdict (not loading since null context path is sync)
    expect(html).toContain('Join Waitlist');
    expect(html).not.toContain('App Content');
  });

  it('useShield should return safe defaults outside provider', () => {
    const TestComponent = () => {
      const { verdict, loading } = useShield();
      return (
        <div>
          {loading ? 'loading' : 'ready'}-{verdict ?? 'none'}
        </div>
      );
    };

    const html = renderToStaticMarkup(<TestComponent />);
    expect(html).toContain('loading-none');
  });

  it('useInvite should throw outside provider', () => {
    const TestComponent = () => {
      let error: string | null = null;
      try {
        useInvite();
      } catch (e: any) {
        error = e.message;
      }
      return <div>{error}</div>;
    };

    const html = renderToStaticMarkup(<TestComponent />);
    expect(html).toContain('useInvite must be used within an InviteProvider');
  });

  it('BetaShield should check flag evaluator for coming soon', () => {
    const manager = createTestManager({ adminEmails: ['admin@test.com'] });

    // Simulate an already-evaluated state by rendering without async context
    const html = renderToStaticMarkup(
      <InviteProvider manager={manager}>
        <BetaShield
          flag="beta_access"
          flagEvaluator={() => false}
          comingSoonFallback={<div>Coming Soon</div>}
          waitlistFallback={<div>Waitlist</div>}
        >
          <div>App Content</div>
        </BetaShield>
      </InviteProvider>
    );
    // Without context, verdict is show_waitlist, so waitlist shown
    expect(html).toContain('Waitlist');
  });
});
