import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function AppButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/35 disabled:cursor-not-allowed disabled:opacity-50',
        'bg-[linear-gradient(135deg,var(--color-brand-navy),var(--color-brand-blue))] text-white shadow-[0_12px_30px_rgba(20,31,71,0.22)] hover:translate-y-[-1px]',
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white/90 px-4 py-2 text-sm font-medium text-[color:var(--color-ink)] transition hover:border-[color:var(--color-brand-blue)]/40 hover:bg-[color:var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/25 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'rounded-[26px] border border-[color:var(--color-border)] bg-white/92 p-5 shadow-[var(--shadow-panel)] backdrop-blur sm:p-6',
        className,
      )}
    >
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
          Admin Console
        </p>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-muted)]">
            {description}
          </p>
        </div>
      </div>
      {action}
    </header>
  );
}

export function StatusPill({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'positive' | 'warning' | 'critical' | 'accent';
}) {
  const toneClass =
    tone === 'positive'
      ? 'border-[color:var(--color-success-border)] bg-[color:var(--color-success-surface)] text-[color:var(--color-success-ink)]'
      : tone === 'warning'
        ? 'border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-surface)] text-[color:var(--color-warning-ink)]'
        : tone === 'critical'
          ? 'border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] text-[color:var(--color-danger-ink)]'
          : tone === 'accent'
            ? 'border-[rgba(225,0,152,0.18)] bg-[rgba(225,0,152,0.1)] text-[color:var(--color-brand-magenta)]'
            : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]';

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em]',
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">{helper}</p>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[color:var(--color-ink)]">{label}</span>
      {children}
      {description ? (
        <span className="text-xs leading-5 text-[color:var(--color-muted)]">{description}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-11 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 text-sm text-[color:var(--color-ink)] outline-none transition placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-brand-blue)]/60 focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/20"
      {...props}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="h-11 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 text-sm text-[color:var(--color-ink)] outline-none transition focus:border-[color:var(--color-brand-blue)]/60 focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/20"
      {...props}
    />
  );
}

export function TextareaInput(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="min-h-28 rounded-[24px] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-ink)] outline-none transition placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-brand-blue)]/60 focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/20"
      {...props}
    />
  );
}

export function InlineNotice({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'warning' | 'critical';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-surface)] text-[color:var(--color-warning-ink)]'
      : tone === 'critical'
        ? 'border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] text-[color:var(--color-danger-ink)]'
        : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]';

  return (
    <div className={cx('rounded-2xl border px-4 py-3 text-sm leading-6', toneClass)}>
      {children}
    </div>
  );
}
