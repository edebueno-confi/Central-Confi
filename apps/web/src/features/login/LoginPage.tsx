import { type FormEvent, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import mascotUrl from '../../../assets/brand/genius-mascot.svg';
import {
  ContractUnavailableState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import {
  AppButton,
  Field,
  GhostButton,
  InlineNotice,
  Panel,
  TextInput,
} from '../../components/ui';
import { signInWithPassword } from '../auth/auth-api';
import { useAuthContext } from '../auth/auth-context';

function sanitizeRedirectTo(rawValue: string | null) {
  if (!rawValue || !rawValue.startsWith('/') || rawValue.startsWith('//')) {
    return '/admin/tenants';
  }

  return rawValue;
}

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = sanitizeRedirectTo(searchParams.get('redirectTo'));
  const {
    phase,
    gate,
    sessionExpired,
    clearSessionExpired,
    configError,
  } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (phase === 'config-error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <ErrorState
          title="Frontend sem configuracao publica minima"
          description={
            configError ??
            'As variaveis publicas do Supabase ainda nao foram configuradas para este ambiente.'
          }
        />
      </div>
    );
  }

  if (phase === 'booting' || (phase === 'authenticated' && gate.phase === 'loading')) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <LoadingState
          title="Carregando sessao"
          description="O frontend esta validando a sessao e o contexto global antes de abrir o shell."
        />
      </div>
    );
  }

  if (phase === 'authenticated' && gate.phase === 'ready') {
    return <Navigate replace to={redirectTo} />;
  }

  if (phase === 'authenticated' && gate.phase === 'denied') {
    return (
      <Navigate
        replace
        state={{ reason: gate.denialReason }}
        to="/access-denied"
      />
    );
  }

  if (phase === 'authenticated' && gate.phase === 'contract-unavailable') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <ContractUnavailableState contractName="gate de profile e roles globais" />
      </div>
    );
  }

  if (phase === 'authenticated' && gate.phase === 'error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <ErrorState
          description={
            gate.message ??
            'A sessao existe, mas o gate administrativo nao conseguiu ser validado.'
          }
        />
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    clearSessionExpired();

    try {
      await signInWithPassword(email.trim(), password);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao autenticar neste ambiente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_460px]">
        <section className="rounded-[36px] border border-white/60 bg-[linear-gradient(180deg,rgba(20,31,71,0.98),rgba(32,60,132,0.96))] p-8 text-white shadow-[0_32px_70px_rgba(20,31,71,0.24)] sm:p-10">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-white/58">
                  Genius Support OS
                </p>
                <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.05em] text-white">
                  Controle global da operacao Genius de trocas, devolucoes e logistica reversa.
                </h1>
                <p className="max-w-xl text-sm leading-7 text-white/74">
                  O console nasce como camada institucional de governanca para a
                  operacao B2B da Genius. Sem help desk, sem IA ativa e sem leitura
                  fora dos contratos aprovados.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/55">
                    Escopo
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/78">
                    Tenants, Access e System para a operacao de pos-venda.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/55">
                    Auth
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/78">
                    Sessao real, profile real e role global real.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/55">
                    Integracao
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/78">
                    Views `vw_admin_*` e RPCs `rpc_admin_*` como fonte unica.
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden rounded-[28px] border border-white/12 bg-white/8 p-4 lg:block">
              <img alt="Mascote Genius" className="w-32" src={mascotUrl} />
            </div>
          </div>
        </section>

        <Panel
          title="Entrar"
          description="A autenticacao usa Supabase Auth. O shell so abre quando o backend confirmar profile ativo e role global platform_admin."
          className="rounded-[32px] p-7 sm:p-8"
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            {sessionExpired ? (
              <InlineNotice tone="warning">
                Sua sessao anterior expirou. Faça login novamente para retomar o Admin Console.
              </InlineNotice>
            ) : null}

            {errorMessage ? (
              <InlineNotice tone="critical">{errorMessage}</InlineNotice>
            ) : null}

            <Field label="Email">
              <TextInput
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@geniusreturn.com"
                required
                type="email"
                value={email}
              />
            </Field>

            <Field label="Senha">
              <TextInput
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Senha da conta aprovada"
                required
                type="password"
                value={password}
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <AppButton disabled={submitting} type="submit">
                {submitting ? 'Validando sessao...' : 'Entrar no Admin Console'}
              </AppButton>
              <GhostButton
                disabled={submitting}
                onClick={() => {
                  setEmail('');
                  setPassword('');
                  setErrorMessage(null);
                  clearSessionExpired();
                }}
              >
                Limpar
              </GhostButton>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
