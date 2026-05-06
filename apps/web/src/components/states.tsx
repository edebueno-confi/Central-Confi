import type { ReactNode } from 'react';
import mascotUrl from '../../assets/brand/genius-mascot.svg';

interface StateFrameProps {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  tone?: 'default' | 'critical' | 'positive';
  compact?: boolean;
}

function toneClasses(tone: StateFrameProps['tone']) {
  if (tone === 'critical') {
    return 'border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)]';
  }

  if (tone === 'positive') {
    return 'border-[color:var(--color-success-border)] bg-[color:var(--color-success-surface)]';
  }

  return 'border-[color:var(--color-border)] bg-white/88';
}

export function StateFrame({
  title,
  description,
  eyebrow,
  actions,
  tone = 'default',
  compact = false,
}: StateFrameProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border p-6 shadow-[var(--shadow-panel)] backdrop-blur sm:p-8 ${toneClasses(
        tone,
      )}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(48,127,226,0.16),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(225,0,152,0.12),transparent_40%)]" />
      <div
        className={`relative grid gap-5 ${compact ? 'md:grid-cols-[80px_minmax(0,1fr)]' : 'md:grid-cols-[116px_minmax(0,1fr)]'}`}
      >
        <div className="flex items-start justify-center rounded-[24px] bg-[linear-gradient(180deg,rgba(20,31,71,0.96),rgba(48,127,226,0.92))] p-3 shadow-[0_16px_40px_rgba(20,31,71,0.18)]">
          <img
            alt="Mascote Genius"
            className={`${compact ? 'w-14' : 'w-20'} h-auto`}
            src={mascotUrl}
          />
        </div>
        <div className="space-y-4">
          {eyebrow ? (
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
              {description}
            </p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}

interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({
  title = 'Preparando a tela',
  description = 'Estamos organizando os dados desta area para liberar a proxima etapa da operacao.',
}: LoadingStateProps) {
  return (
    <StateFrame
      title={title}
      description={description}
      eyebrow="loading"
      actions={
        <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--color-border)] bg-white/90 px-4 py-2 text-sm text-[color:var(--color-ink)]">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[color:var(--color-brand-blue)]" />
          Aguarde alguns instantes.
        </div>
      }
    />
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <StateFrame
      title={title}
      description={description}
      eyebrow="vazio"
      compact
      actions={action}
    />
  );
}

interface ErrorStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
}

export function ErrorState({
  title = 'Nao foi possivel carregar esta area',
  description,
  action,
}: ErrorStateProps) {
  return (
    <StateFrame
      title={title}
      description={description}
      eyebrow="erro"
      tone="critical"
      actions={action}
    />
  );
}

interface AccessDeniedStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
}

export function AccessDeniedState({
  title = 'Acesso nao autorizado',
  description,
  action,
}: AccessDeniedStateProps) {
  return (
    <StateFrame
      title={title}
      description={description}
      eyebrow="permissao"
      tone="critical"
      actions={action}
    />
  );
}

interface ContractUnavailableStateProps {
  contractName: string;
  action?: ReactNode;
}

export function ContractUnavailableState({
  contractName,
  action,
}: ContractUnavailableStateProps) {
  return (
    <StateFrame
      title="Recurso indisponivel"
      description={`Esta area depende de ${contractName}, mas esse recurso nao esta disponivel neste ambiente agora.`}
      eyebrow="indisponivel"
      actions={action}
    />
  );
}

interface SessionExpiredStateProps {
  action?: ReactNode;
}

export function SessionExpiredState({ action }: SessionExpiredStateProps) {
  return (
    <StateFrame
      title="Sessao expirada"
      description="Sua sessao perdeu validade durante a operacao. Entre novamente para continuar no workspace."
      eyebrow="auth"
      tone="critical"
      actions={action}
    />
  );
}
