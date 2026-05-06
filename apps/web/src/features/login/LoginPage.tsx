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
          title="Ambiente de acesso indisponivel"
          description={
            configError ??
            'As configuracoes minimas deste ambiente ainda nao foram liberadas.'
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
          description="Estamos validando sua sessao antes de abrir o workspace."
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
        <ContractUnavailableState contractName="acesso do workspace" />
      </div>
    );
  }

  if (phase === 'authenticated' && gate.phase === 'error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <ErrorState
          description={
            gate.message ??
            'Sua sessao foi encontrada, mas o acesso ao workspace nao conseguiu ser validado.'
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f6f9ff_42%,#f2f5fb_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-6 lg:grid-cols-[minmax(0,1.08fr)_420px]">
        <section className="relative overflow-hidden rounded-[38px] border border-white/55 bg-[linear-gradient(180deg,#071942_0%,#0b235b_54%,#103071_100%)] p-8 text-white shadow-[0_32px_70px_rgba(20,31,71,0.24)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(48,127,226,0.22),transparent_36%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/14 bg-white/8 px-4 py-2">
                  <img alt="Mascote Genius" className="w-9 shrink-0" src={mascotUrl} />
                  <div className="leading-tight">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/58">
                      Genius
                    </p>
                    <p className="text-base font-semibold text-white">Support Workspace</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-white/58">
                    Entrada do workspace
                  </p>
                  <h1 className="max-w-2xl text-[clamp(2.8rem,5vw,4.4rem)] font-semibold tracking-[-0.07em] leading-[1.02] text-white">
                    Acesse a operacao interna da Genius com foco em atendimento, clientes e governanca.
                  </h1>
                  <p className="max-w-xl text-base leading-8 text-white/74">
                    Entre para abrir a fila operacional, tratar tickets, revisar clientes B2B e acompanhar as superficies internas aprovadas.
                  </p>
                </div>
              </div>

              <div className="hidden rounded-[28px] border border-white/12 bg-white/8 p-4 lg:block">
                <img alt="Mascote Genius" className="w-32" src={mascotUrl} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[26px] border border-white/12 bg-white/8 p-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/55">
                  Atendimento
                </p>
                <p className="mt-3 text-sm leading-7 text-white/78">
                  Fila, conversa, contexto do cliente e conhecimento relacionado na mesma rotina.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/12 bg-white/8 p-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/55">
                  Governanca
                </p>
                <p className="mt-3 text-sm leading-7 text-white/78">
                  Tenants, acessos, knowledge e observabilidade administrativa com leitura operacional.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/12 bg-white/8 p-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/55">
                  Continuidade
                </p>
                <p className="mt-3 text-sm leading-7 text-white/78">
                  Entre com sua conta aprovada para retomar exatamente a area onde a operacao parou.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Panel
          title="Entrar"
          description="Use sua conta aprovada para abrir o workspace interno da Genius."
          className="rounded-[34px] border-white/70 bg-white/94 p-7 shadow-[0_30px_64px_rgba(20,31,71,0.12)] sm:p-8"
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            {sessionExpired ? (
              <InlineNotice tone="warning">
                Sua sessao anterior expirou. Entre novamente para retomar o workspace.
              </InlineNotice>
            ) : null}

            {errorMessage ? (
              <InlineNotice tone="critical">{errorMessage}</InlineNotice>
            ) : null}

            <Field label="Email">
              <TextInput
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
                required
                type="email"
                value={email}
              />
            </Field>

            <Field label="Senha">
              <TextInput
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                required
                type="password"
                value={password}
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <AppButton disabled={submitting} type="submit">
                {submitting ? 'Validando acesso...' : 'Entrar no workspace'}
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

            <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                Dica
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
                Depois do login, a navegacao abre a area autorizada da sua rotina sem expor informacoes fora do seu escopo.
              </p>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
