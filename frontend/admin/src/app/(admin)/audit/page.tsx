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

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
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

  const actionColor: Record<string, string> = {
    login: 'bg-blue-100 text-blue-700',
    emission: 'bg-green-100 text-green-700',
    webhook: 'bg-purple-100 text-purple-700',
    config: 'bg-yellow-100 text-yellow-700',
    mapping: 'bg-indigo-100 text-indigo-700',
    subscription: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Log de Auditoria</h1>
        <p className="text-slate-500 mt-1">Registro de actividad del sistema ({total} registros)</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white"
        >
          {actionOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white"
        />
        {(actionFilter || dateFilter) && (
          <button
            onClick={() => { setActionFilter(''); setDateFilter(''); }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Audit log table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Sin registros de auditoria</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Accion</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID Entidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAtUtc).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{log.companyName || <span className="text-slate-400">Sistema</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${actionColor[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{log.entityType}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.entityId ? log.entityId.slice(0, 8) + '...' : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-sm text-slate-500">Pagina {page} de {Math.ceil(total / 50)}</span>
            <div className="space-x-2">
              <button disabled={page <= 1} onClick={() => { setPage(page - 1); loadLogs(page - 1); }} className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50">Anterior</button>
              <button disabled={page * 50 >= total} onClick={() => { setPage(page + 1); loadLogs(page + 1); }} className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
