import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CommercialKpiOwner } from '../analytics-model';

const COLORS = {
  primary: 'var(--color-brand-blue)',
  positive: 'var(--color-success-ink)',
  warning: 'var(--color-warning-ink)',
  danger: 'var(--color-danger-ink)',
  grid: 'var(--analytics-chart-grid)',
  axis: 'var(--analytics-chart-axis)',
};

const AXIS_STYLE = { fontSize: 11, fill: COLORS.axis } as const;

function ChartFrame({ children, height }: { children: React.ReactElement; height: number }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function formatCount(value: unknown): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString('pt-BR') : 'Indisponível';
}

function formatCurrency(value: unknown): string {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : 'Indisponível';
}

export function CommercialOwnerPerformanceChart({ owners }: { owners: CommercialKpiOwner[] }) {
  const rows = owners.slice(0, 10).map((owner) => ({
    name: owner.ownerName,
    openDeals: owner.openDeals,
    wonDeals: owner.wonDeals,
    lostDeals: owner.lostDeals,
  }));

  return (
    <ChartFrame height={Math.max(240, rows.length * 44)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke={COLORS.grid} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} />
        <YAxis type="category" dataKey="name" width={132} tick={AXIS_STYLE} />
        <Tooltip
          cursor={{ fill: 'var(--analytics-chart-cursor)' }}
          formatter={(value: unknown, name: unknown) => [formatCount(value), name === 'openDeals' ? 'Abertos agora' : name === 'wonDeals' ? 'Ganhos' : 'Perdidos']}
        />
        <Legend formatter={(value) => value === 'openDeals' ? 'Abertos agora' : value === 'wonDeals' ? 'Ganhos' : 'Perdidos'} />
        <Bar dataKey="openDeals" name="openDeals" fill={COLORS.primary} radius={[0, 3, 3, 0]} />
        <Bar dataKey="wonDeals" name="wonDeals" fill={COLORS.positive} radius={[0, 3, 3, 0]} />
        <Bar dataKey="lostDeals" name="lostDeals" fill={COLORS.danger} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

export interface CustomerSuccessOwnerPerformanceRow {
  name: string;
  customers: number;
  mrr: number;
  overdueCustomers: number;
  inactiveCustomers: number;
}

export function CustomerSuccessOwnerPerformanceChart({ owners }: { owners: CustomerSuccessOwnerPerformanceRow[] }) {
  const rows = owners.slice(0, 10);
  return (
    <ChartFrame height={Math.max(240, rows.length * 44)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke={COLORS.grid} />
        <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} tick={AXIS_STYLE} />
        <YAxis type="category" dataKey="name" width={132} tick={AXIS_STYLE} />
        <Tooltip
          cursor={{ fill: 'var(--analytics-chart-cursor)' }}
          formatter={(value: unknown) => [formatCurrency(value), 'MRR']}
        />
        <Bar dataKey="mrr" name="MRR" fill={COLORS.primary} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

export interface SupportOwnerPerformanceRow {
  key: string;
  name: string;
  openTickets: number;
  createdTickets: number;
  resolvedTickets: number;
  medianResolutionDays: number | null;
}

export function SupportOwnerPerformanceChart({ owners }: { owners: SupportOwnerPerformanceRow[] }) {
  const rows = owners.slice(0, 10);
  return (
    <ChartFrame height={Math.max(240, rows.length * 44)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke={COLORS.grid} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} />
        <YAxis type="category" dataKey="name" width={132} tick={AXIS_STYLE} />
        <Tooltip
          cursor={{ fill: 'var(--analytics-chart-cursor)' }}
          formatter={(value: unknown, name: unknown) => [formatCount(value), name === 'openTickets' ? 'Em aberto' : name === 'createdTickets' ? 'Entraram' : 'Resolvidos']}
        />
        <Legend formatter={(value) => value === 'openTickets' ? 'Em aberto' : value === 'createdTickets' ? 'Entraram' : 'Resolvidos'} />
        <Bar dataKey="openTickets" name="openTickets" fill={COLORS.primary} radius={[0, 3, 3, 0]} />
        <Bar dataKey="createdTickets" name="createdTickets" fill={COLORS.warning} radius={[0, 3, 3, 0]} />
        <Bar dataKey="resolvedTickets" name="resolvedTickets" fill={COLORS.positive} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartFrame>
  );
}
