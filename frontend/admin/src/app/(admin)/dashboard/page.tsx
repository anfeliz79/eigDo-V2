'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminStats, type RecentCompany, type RecentDocument } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                   */
/* ------------------------------------------------------------------ */

function SkeletonPulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-4">
        <SkeletonPulse className="h-11 w-11 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-3 w-20" />
          <SkeletonPulse className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

function TableRowSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonPulse className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <svg
        className="w-16 h-16 text-gray-300 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const DOC_STATUS_MAP: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  Accepted:  { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Aceptado' },
  Rejected:  { dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700',     label: 'Rechazado' },
  Submitted: { dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Enviado' },
  Queued:    { dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'En cola' },
  Draft:     { dot: 'bg-gray-400',    bg: 'bg-gray-100',   text: 'text-gray-600',    label: 'Borrador' },
};

function StatusBadge({ status }: { status: string }) {
  const s = DOC_STATUS_MAP[status] ?? { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {active ? 'Activa' : 'Inactiva'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card config                                                   */
/* ------------------------------------------------------------------ */

interface StatCardDef {
  label: string;
  getValue: (s: AdminStats) => string;
  accent: string;       // left-border color class
  iconBg: string;       // icon wrapper background
  iconColor: string;    // icon stroke color
  icon: string;         // SVG path
}

const STAT_CARDS: StatCardDef[] = [
  {
    label: 'Empresas Activas',
    getValue: (s) => s.activeCompanies.toLocaleString('es-DO'),
    accent: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  },
  {
    label: 'Suscripciones',
    getValue: (s) => s.activeSubscriptions.toLocaleString('es-DO'),
    accent: 'border-l-violet-500',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'e-CF Hoy',
    getValue: (s) => s.ecfToday.toLocaleString('es-DO'),
    accent: 'border-l-purple-500',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  },
  {
    label: 'Errores e-CF',
    getValue: (s) => s.ecfErrors.toLocaleString('es-DO'),
    accent: 'border-l-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
  {
    label: 'Tickets Abiertos',
    getValue: (s) => s.openTickets.toLocaleString('es-DO'),
    accent: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
  },
  {
    label: 'Ingresos Mensuales',
    getValue: (s) =>
      `RD$ ${s.monthlyRevenue.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    accent: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getStats().catch(() => null),
      adminApi.getRecentCompanies().catch(() => []),
      adminApi.getRecentDocuments().catch(() => []),
    ]).then(([s, c, d]) => {
      setStats(s);
      setRecentCompanies(c);
      setRecentDocs(d);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel de Administración</h1>
        <p className="text-sm text-gray-500 mt-1">Vista general del sistema eigdo</p>
      </div>

      {/* ---- Stat cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : STAT_CARDS.map((card) => {
              const isRevenue = card.label === 'Ingresos Mensuales';
              return (
                <div
                  key={card.label}
                  className={`
                    bg-white rounded-xl border border-gray-100 shadow-sm
                    border-l-4 ${card.accent} p-5
                    transition-shadow hover:shadow-md
                    ${isRevenue ? 'ring-1 ring-emerald-100' : ''}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                      <svg className={`w-5 h-5 ${card.iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{card.label}</p>
                      <p className={`text-xl font-bold mt-0.5 ${isRevenue ? 'text-emerald-700' : 'text-gray-900'}`}>
                        {stats ? card.getValue(stats) : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* ---- Summary totals ---- */}
      {!loading && stats && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-5 py-3 border border-gray-100">
          <span>
            Total empresas:{' '}
            <strong className="text-gray-800 font-semibold">{stats.totalCompanies.toLocaleString('es-DO')}</strong>
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>
            Total usuarios:{' '}
            <strong className="text-gray-800 font-semibold">{stats.totalUsers.toLocaleString('es-DO')}</strong>
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>
            Total e-CF emitidos:{' '}
            <strong className="text-gray-800 font-semibold">{stats.ecfTotal.toLocaleString('es-DO')}</strong>
          </span>
        </div>
      )}

      {/* ---- Tables section ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* -- Recent Companies -- */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Actividad Reciente</h2>
            <p className="text-xs text-gray-400 mt-0.5">Últimas empresas registradas</p>
          </div>

          {loading ? (
            <table className="w-full">
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={3} />
                ))}
              </tbody>
            </table>
          ) : recentCompanies.length === 0 ? (
            <EmptyState title="Sin empresas registradas" subtitle="Las nuevas empresas aparecerán aquí" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Empresa</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.rnc || 'Sin RNC'}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <ActiveBadge active={c.isActive} />
                      </td>
                      <td className="px-6 py-3.5 text-right text-xs text-gray-500 whitespace-nowrap">
                        {new Date(c.createdAtUtc).toLocaleDateString('es-DO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* -- Recent Documents -- */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Documentos Recientes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Últimos e-CF procesados</p>
          </div>

          {loading ? (
            <table className="w-full">
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={4} />
                ))}
              </tbody>
            </table>
          ) : recentDocs.length === 0 ? (
            <EmptyState title="Sin documentos emitidos" subtitle="Los e-CF procesados aparecerán aquí" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Monto</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentDocs.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-gray-900">{d.ecfType}</p>
                        {d.encf && <p className="text-xs text-gray-400 font-mono mt-0.5">{d.encf}</p>}
                      </td>
                      <td className="px-6 py-3.5 text-gray-700 whitespace-nowrap">
                        RD$ {d.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-6 py-3.5 text-right text-xs text-gray-500 whitespace-nowrap">
                        {new Date(d.createdAtUtc).toLocaleDateString('es-DO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
