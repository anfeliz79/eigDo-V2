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
    { label: 'Empresas Activas', value: stats?.activeCompanies ?? '--', color: 'bg-blue-500' },
    { label: 'Suscripciones', value: stats?.activeSubscriptions ?? '--', color: 'bg-green-500' },
    { label: 'e-CF Hoy', value: stats?.ecfToday ?? '--', color: 'bg-purple-500' },
    { label: 'Errores Hoy', value: stats?.ecfErrors ?? '--', color: 'bg-red-500' },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <span className="text-sm font-medium text-slate-500">{s.label}</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{loading ? '...' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Totals bar */}
      {stats && (
        <div className="flex gap-6 text-sm text-slate-500">
          <span>Total empresas: <strong className="text-slate-700">{stats.totalCompanies}</strong></span>
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
