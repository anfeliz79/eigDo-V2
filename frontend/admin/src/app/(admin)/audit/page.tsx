'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AuditLogEntry } from '@/lib/api';

const actionOptions = [
  { value: '', label: 'Todas las acciones' },
  { value: 'login', label: 'Login' },
  { value: 'emission', label: 'Emision' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'config', label: 'Configuracion' },
  { value: 'mapping', label: 'Mapeo' },
  { value: 'subscription', label: 'Suscripcion' },
];

const actionColor: Record<string, { bg: string; text: string }> = {
  login: { bg: 'bg-blue-50', text: 'text-blue-700' },
  emission: { bg: 'bg-green-50', text: 'text-green-700' },
  webhook: { bg: 'bg-purple-50', text: 'text-purple-700' },
  config: { bg: 'bg-amber-50', text: 'text-amber-700' },
  mapping: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  subscription: { bg: 'bg-orange-50', text: 'text-orange-700' },
};

const defaultActionColor = { bg: 'bg-gray-50', text: 'text-gray-600' };

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const loadLogs = (p = page) => {
    setLoading(true);
    adminApi.getAuditLogs({
      page: p,
      pageSize: 50,
      action: actionFilter || undefined,
      from: dateFilter ? `${dateFilter}T00:00:00Z` : undefined,
      to: dateFilter ? `${dateFilter}T23:59:59Z` : undefined,
    })
      .then((res) => { setLogs(res.items); setTotal(res.total); })
      .catch(() => { setLogs([]); setTotal(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(1); setPage(1); }, [actionFilter, dateFilter]);

  const totalPages = Math.ceil(total / 50);
  const hasFilters = actionFilter || dateFilter;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Log de Auditoria</h1>
        <p className="text-gray-500 mt-2">
          Registro de actividad del sistema
          {total > 0 && <span className="ml-1 text-gray-400">({total.toLocaleString()} registros)</span>}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Action filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors min-w-[180px]"
            >
              {actionOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Date filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setActionFilter(''); setDateFilter(''); }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 text-sm">Sin registros de auditoria</p>
            {hasFilters && (
              <p className="text-gray-400 text-xs mt-1">Intenta ajustar los filtros</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Accion</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entidad</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Entidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const color = actionColor[log.action] || defaultActionColor;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap font-mono">
                        {new Date(log.createdAtUtc).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {log.companyName || <span className="text-gray-400 italic">Sistema</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${color.bg} ${color.text}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.entityType}</td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                        {log.entityId ? log.entityId.slice(0, 8) + '...' : '\u2014'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-gray-500">
              Pagina <span className="font-medium text-gray-700">{page}</span> de <span className="font-medium text-gray-700">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => { setPage(page - 1); loadLogs(page - 1); }}
                className="inline-flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Anterior
              </button>
              <button
                disabled={page * 50 >= total}
                onClick={() => { setPage(page + 1); loadLogs(page + 1); }}
                className="inline-flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
