import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useEffectEvent,
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

  const loadGate = useEffectEvent(async () => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setGate({
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
        setGate({
          phase: 'ready',
          actor: result.actor,
          denialReason: null,
          message: null,
        });
        return;
      }

      setGate({
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
        setGate({
          phase: 'contract-unavailable',
          actor: null,
          denialReason: null,
          message: error.message,
        });
        return;
      }

      setGate({
        phase: 'error',
        actor: null,
        denialReason: null,
        message:
          error instanceof Error
            ? error.message
            : 'Falha ao validar o contexto administrativo.',
      });
    }
  });

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
          setPhase('anonymous');
          setSession(null);
          setUser(null);
          return;
        }

        const nextSession = data.session ?? null;
        sessionRef.current = nextSession;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setPhase(nextSession ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (unsubscribed) {
          return;
        }

        setPhase('anonymous');
        setSession(null);
        setUser(null);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (sessionRef.current && !nextSession && !manualSignOutRef.current) {
        setSessionExpired(true);
      }

      sessionRef.current = nextSession;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setPhase(nextSession ? 'authenticated' : 'anonymous');
      setGate(initialGateState);

      if (manualSignOutRef.current && !nextSession) {
        manualSignOutRef.current = false;
      }
    });

    return () => {
      unsubscribed = true;
      subscription.unsubscribe();
    };
  }, [runtime]);

  useEffect(() => {
    if (phase !== 'authenticated' || !user) {
      if (phase !== 'booting') {
        setGate(initialGateState);
      }
      return;
    }

    void loadGate();
  }, [phase, user, loadGate]);

  const value: AuthContextValue = {
    phase,
    session,
    user,
    runtimeConfig: runtime.ok ? runtime.config : null,
    configError: runtime.ok
      ? null
      : `Variaveis ausentes: ${runtime.error.missingKeys.join(', ')}`,
    gate,
    sessionExpired,
    refreshGate: async () => {
      if (!user) {
        return;
      }

      await loadGate();
    },
    signOut: async () => {
      manualSignOutRef.current = true;
      setSessionExpired(false);
      await signOutAdminSession();
    },
    clearSessionExpired: () => {
      setSessionExpired(false);
    },
    markSessionExpired: () => {
      setSessionExpired(true);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
}
