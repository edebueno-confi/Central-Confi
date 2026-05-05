import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AppError } from '../../app/errors';
import { readRuntimeConfig, type RuntimeConfig } from '../../app/runtime-config';
import { getSupabaseBrowserClient } from '../../app/supabase-browser';
import {
  fetchAdminActorContext,
  signOutAdminSession,
  type AdminActorContext,
} from './auth-api';

type AuthPhase = 'booting' | 'anonymous' | 'authenticated' | 'config-error';
type GatePhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'denied'
  | 'contract-unavailable'
  | 'error';

interface GateState {
  phase: GatePhase;
  actor: AdminActorContext | null;
  denialReason: 'missing-profile' | 'inactive-profile' | 'missing-platform-admin' | null;
  message: string | null;
}

interface AuthContextValue {
  phase: AuthPhase;
  session: Session | null;
  user: User | null;
  runtimeConfig: RuntimeConfig | null;
  configError: string | null;
  gate: GateState;
  sessionExpired: boolean;
  refreshGate: () => Promise<void>;
  signOut: () => Promise<void>;
  clearSessionExpired: () => void;
  markSessionExpired: () => void;
}

const initialGateState: GateState = {
  phase: 'idle',
  actor: null,
  denialReason: null,
  message: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function sameGateState(left: GateState, right: GateState) {
  return (
    left.phase === right.phase &&
    left.actor === right.actor &&
    left.denialReason === right.denialReason &&
    left.message === right.message
  );
}

function sameUser(left: User | null, right: User | null) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.email === right.email &&
    left.last_sign_in_at === right.last_sign_in_at &&
    left.updated_at === right.updated_at
  );
}

function sameSession(left: Session | null, right: Session | null) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.access_token === right.access_token &&
    left.refresh_token === right.refresh_token &&
    left.expires_at === right.expires_at &&
    sameUser(left.user, right.user)
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const runtime = useMemo(() => readRuntimeConfig(), []);
  const [phase, setPhase] = useState<AuthPhase>(runtime.ok ? 'booting' : 'config-error');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [gate, setGate] = useState<GateState>(initialGateState);
  const [sessionExpired, setSessionExpired] = useState(false);
  const requestIdRef = useRef(0);
  const manualSignOutRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const lastGateUserIdRef = useRef<string | null>(null);

  const setGateIfChanged = useCallback((nextGate: GateState) => {
    setGate((currentGate) => (sameGateState(currentGate, nextGate) ? currentGate : nextGate));
  }, []);

  const applyAuthSnapshot = useCallback(
    (nextSession: Session | null) => {
      const previousSession = sessionRef.current;
      const previousUserId = previousSession?.user.id ?? null;
      const nextUserId = nextSession?.user.id ?? null;
      const identityChanged = previousUserId !== nextUserId;

      if (previousSession && !nextSession && !manualSignOutRef.current) {
        setSessionExpired(true);
      }

      sessionRef.current = nextSession;

      setSession((currentSession) =>
        sameSession(currentSession, nextSession) ? currentSession : nextSession,
      );

      const nextUser = nextSession?.user ?? null;
      setUser((currentUser) => (sameUser(currentUser, nextUser) ? currentUser : nextUser));

      const nextPhase = nextSession ? 'authenticated' : 'anonymous';
      setPhase((currentPhase) => (currentPhase === nextPhase ? currentPhase : nextPhase));

      if (identityChanged) {
        lastGateUserIdRef.current = null;
        setGateIfChanged(initialGateState);
      }

      if (manualSignOutRef.current && !nextSession) {
        manualSignOutRef.current = false;
      }
    },
    [setGateIfChanged],
  );

  const loadGate = useCallback(async (force = false) => {
    const activeUserId = sessionRef.current?.user.id ?? null;
    if (!activeUserId) {
      return;
    }

    if (!force && lastGateUserIdRef.current === activeUserId) {
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setGateIfChanged({
      phase: 'loading',
      actor: null,
      denialReason: null,
      message: null,
    });

    try {
      const result = await fetchAdminActorContext();

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (result.status === 'ready') {
        lastGateUserIdRef.current = activeUserId;
        setGateIfChanged({
          phase: 'ready',
          actor: result.actor,
          denialReason: null,
          message: null,
        });
        return;
      }

      lastGateUserIdRef.current = activeUserId;
      setGateIfChanged({
        phase: 'denied',
        actor: null,
        denialReason: result.reason,
        message: null,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (error instanceof AppError && error.code === 'contract-unavailable') {
        setGateIfChanged({
          phase: 'contract-unavailable',
          actor: null,
          denialReason: null,
          message: error.message,
        });
        return;
      }

      setGateIfChanged({
        phase: 'error',
        actor: null,
        denialReason: null,
        message:
          error instanceof Error
            ? error.message
            : 'Falha ao validar o contexto administrativo.',
      });
    }
  }, [setGateIfChanged]);

  useEffect(() => {
    if (!runtime.ok) {
      return;
    }

    const client = getSupabaseBrowserClient();

    if (!client) {
      setPhase('config-error');
      return;
    }

    let unsubscribed = false;

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (unsubscribed) {
          return;
        }

        if (error) {
          applyAuthSnapshot(null);
          return;
        }

        applyAuthSnapshot(data.session ?? null);
      })
      .catch(() => {
        if (unsubscribed) {
          return;
        }

        applyAuthSnapshot(null);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      applyAuthSnapshot(nextSession);
    });

    return () => {
      unsubscribed = true;
      subscription.unsubscribe();
    };
  }, [applyAuthSnapshot, runtime]);

  useEffect(() => {
    if (phase !== 'authenticated' || !user) {
      if (phase !== 'booting') {
        lastGateUserIdRef.current = null;
        setGateIfChanged(initialGateState);
      }
      return;
    }

    if (lastGateUserIdRef.current === user.id) {
      return;
    }

    void loadGate();
  }, [loadGate, phase, setGateIfChanged, user?.id]);

  const refreshGate = useCallback(async () => {
    if (!sessionRef.current?.user.id) {
      return;
    }

    lastGateUserIdRef.current = null;
    await loadGate(true);
  }, [loadGate]);

  const signOut = useCallback(async () => {
    manualSignOutRef.current = true;
    setSessionExpired(false);
    lastGateUserIdRef.current = null;
    await signOutAdminSession();
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const markSessionExpired = useCallback(() => {
    setSessionExpired(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      phase,
      session,
      user,
      runtimeConfig: runtime.ok ? runtime.config : null,
      configError: runtime.ok
        ? null
        : `Variaveis ausentes: ${runtime.error.missingKeys.join(', ')}`,
      gate,
      sessionExpired,
      refreshGate,
      signOut,
      clearSessionExpired,
      markSessionExpired,
    }),
    [
      clearSessionExpired,
      gate,
      markSessionExpired,
      phase,
      refreshGate,
      runtime,
      session,
      sessionExpired,
      signOut,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
}
