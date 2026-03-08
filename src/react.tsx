import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { InviteManager } from './invite-manager.js';
import type { ShieldEvaluation, InviteContext } from './types.js';

interface InviteContextValue {
  manager: InviteManager;
  evaluation: ShieldEvaluation | null;
  loading: boolean;
  version: number;
  reevaluate: () => void;
}

const InviteCtx = createContext<InviteContextValue | null>(null);

export interface InviteProviderProps {
  manager: InviteManager;
  context?: InviteContext;
  children: ReactNode;
}

export function InviteProvider({
  manager,
  context,
  children,
}: InviteProviderProps): React.JSX.Element {
  const [version, setVersion] = useState(0);
  const [evaluation, setEvaluation] = useState<ShieldEvaluation | null>(
    context ? null : { verdict: 'show_waitlist' }
  );
  const [loading, setLoading] = useState(!!context);

  const doEvaluate = useCallback(() => {
    if (!context) {
      setEvaluation({ verdict: 'show_waitlist' });
      setLoading(false);
      return;
    }
    setLoading(true);
    manager
      .evaluate(context)
      .then((result) => {
        setEvaluation(result);
        setLoading(false);
      })
      .catch(() => {
        setEvaluation({ verdict: 'show_waitlist' });
        setLoading(false);
      });
  }, [manager, context]);

  useEffect(() => {
    doEvaluate();
  }, [doEvaluate]);

  useEffect(() => {
    return manager.subscribe(() => {
      setVersion((v) => v + 1);
    });
  }, [manager]);

  const reevaluate = useCallback(() => {
    doEvaluate();
  }, [doEvaluate]);

  const value = useMemo(
    () => ({ manager, evaluation, loading, version, reevaluate }),
    [manager, evaluation, loading, version, reevaluate]
  );

  return <InviteCtx.Provider value={value}>{children}</InviteCtx.Provider>;
}

export function useInvite(): InviteContextValue {
  const ctx = useContext(InviteCtx);
  if (!ctx) {
    throw new Error('useInvite must be used within an InviteProvider.');
  }
  return ctx;
}

export function useShield(): {
  verdict: ShieldEvaluation['verdict'] | null;
  method: ShieldEvaluation['method'];
  loading: boolean;
  waitlistPosition: number | undefined;
} {
  const ctx = useContext(InviteCtx);
  if (!ctx) {
    return {
      verdict: null,
      method: undefined,
      loading: true,
      waitlistPosition: undefined,
    };
  }
  return {
    verdict: ctx.evaluation?.verdict ?? null,
    method: ctx.evaluation?.method,
    loading: ctx.loading,
    waitlistPosition: ctx.evaluation?.waitlistPosition,
  };
}

export interface BetaShieldProps {
  flag?: string;
  flagEvaluator?: (flagId: string) => boolean;
  waitlistFallback?: ReactNode;
  comingSoonFallback?: ReactNode;
  loadingFallback?: ReactNode;
  children: ReactNode;
}

export function BetaShield({
  flag,
  flagEvaluator,
  waitlistFallback = null,
  comingSoonFallback = null,
  loadingFallback = null,
  children,
}: BetaShieldProps): React.JSX.Element {
  const ctx = useContext(InviteCtx);

  useEffect(() => {
    ctx?.manager.trackEvent('shield_impression');
  }, [ctx?.manager]);

  if (!ctx || ctx.loading) {
    return <>{loadingFallback}</>;
  }

  const verdict = ctx.evaluation?.verdict;

  if (verdict === 'show_waitlist') {
    return <>{waitlistFallback}</>;
  }

  if (verdict === 'access_granted') {
    // If a flag is specified, check it too
    if (flag && flagEvaluator) {
      const flagEnabled = flagEvaluator(flag);
      if (!flagEnabled) {
        return <>{comingSoonFallback}</>;
      }
    }
    return <>{children}</>;
  }

  return <>{waitlistFallback}</>;
}

export interface WaitlistFormProps {
  onSubmit?: (email: string, position: number) => void;
  source?: string;
  referralCode?: string;
  children?: (props: {
    submit: (email: string) => Promise<void>;
    position: number | null;
    submitting: boolean;
    error: string | null;
  }) => ReactNode;
}

export function WaitlistForm({
  onSubmit,
  source,
  referralCode,
  children,
}: WaitlistFormProps): React.JSX.Element {
  const ctx = useContext(InviteCtx);
  const [position, setPosition] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (email: string) => {
      if (!ctx) {
        setError('Invite system not initialized');
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const pos = await ctx.manager.joinWaitlist(email, source, referralCode);
        setPosition(pos);
        onSubmit?.(email, pos);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to join waitlist');
      } finally {
        setSubmitting(false);
      }
    },
    [ctx, source, referralCode, onSubmit]
  );

  if (children) {
    return <>{children({ submit, position, submitting, error })}</>;
  }

  return <></>;
}

export interface InviteCodeEntryProps {
  onRedeem?: (code: string, success: boolean) => void;
  userId: string;
  children?: (props: {
    redeem: (code: string) => Promise<boolean>;
    redeeming: boolean;
    error: string | null;
    success: boolean;
  }) => ReactNode;
}

export function InviteCodeEntry({
  onRedeem,
  userId,
  children,
}: InviteCodeEntryProps): React.JSX.Element {
  const ctx = useContext(InviteCtx);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const redeem = useCallback(
    async (code: string) => {
      if (!ctx) {
        setError('Invite system not initialized');
        return false;
      }
      setRedeeming(true);
      setError(null);
      setSuccess(false);
      try {
        const result = await ctx.manager.redeemInviteCode(code, userId);
        setSuccess(result);
        if (!result) setError('Invalid or expired invite code');
        onRedeem?.(code, result);
        if (result) ctx.reevaluate();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to redeem code');
        return false;
      } finally {
        setRedeeming(false);
      }
    },
    [ctx, userId, onRedeem]
  );

  if (children) {
    return <>{children({ redeem, redeeming, error, success })}</>;
  }

  return <></>;
}
