'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminStats, type RecentCompany, type RecentDocument } from '@/lib/api';

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

  const statCards = [
    { label: 'Empresas Activas', value: stats?.activeCompanies ?? '--', color: 'bg-blue-500', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
    { label: 'Suscripciones', value: stats?.activeSubscriptions ?? '--', color: 'bg-green-500', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'e-CF Hoy', value: stats?.ecfToday ?? '--', color: 'bg-purple-500', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
    { label: 'Errores Hoy', value: stats?.ecfErrors ?? '--', color: 'bg-red-500', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
    { label: 'Tickets Abiertos', value: stats?.openTickets ?? '--', color: 'bg-amber-500', icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155' },
    { label: 'Ingresos Mes', value: stats ? `RD$ ${stats.monthlyRevenue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '--', color: 'bg-emerald-500', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const statusColor: Record<string, string> = {
    Accepted: 'text-green-600',
    Rejected: 'text-red-600',
    Submitted: 'text-blue-600',
    Queued: 'text-yellow-600',
    Draft: 'text-gray-500',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
        <p className="text-slate-500 mt-1">Vista general del sistema eigdo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">{s.label}</span>
                <p className="text-xl font-bold text-slate-900">{loading ? '...' : s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals bar */}
      {stats && (
        <div className="flex gap-6 text-sm text-slate-500 flex-wrap">
          <span>Total empresas: <strong className="text-slate-700">{stats.totalCompanies}</strong></span>
          <span>Total usuarios: <strong className="text-slate-700">{stats.totalUsers}</strong></span>
          <span>Total e-CF emitidos: <strong className="text-slate-700">{stats.ecfTotal}</strong></span>
        </div>
      )}

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Empresas Recientes</h3>
          {recentCompanies.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No hay empresas registradas</div>
          ) : (
            <div className="space-y-3">
              {recentCompanies.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.rnc || 'Sin RNC'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${c.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      {c.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                    <p className="text-xs text-slate-400">{new Date(c.createdAtUtc).toLocaleDateString('es-DO')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Documentos Recientes</h3>
          {recentDocs.length === 0 ? (
            <div className="text-center text-slate-400 py-8">Sin documentos emitidos</div>
          ) : (
            <div className="space-y-3">
              {recentDocs.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{d.ecfType} {d.encf && <span className="font-mono text-xs text-slate-500">({d.encf})</span>}</p>
                    <p className="text-xs text-slate-400">RD$ {d.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${statusColor[d.status] || 'text-gray-500'}`}>{d.status}</span>
                    <p className="text-xs text-slate-400">{new Date(d.createdAtUtc).toLocaleDateString('es-DO')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
