'use client';

import { useEffect, useState } from 'react';
import { api, type EcfDocument, type DocumentStats } from '@/lib/api';

const PAGE_SIZE = 20;

const statusLabels: Record<string, { label: string; class: string }> = {
  Draft: { label: 'Borrador', class: 'bg-gray-100 text-gray-700' },
  Queued: { label: 'En Cola', class: 'bg-yellow-100 text-yellow-700' },
  Submitted: { label: 'Enviado', class: 'bg-blue-100 text-blue-700' },
  Accepted: { label: 'Aceptado', class: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Rechazado', class: 'bg-red-100 text-red-700' },
  Annulled: { label: 'Anulado', class: 'bg-gray-200 text-gray-600' },
  BlockedByConfig: { label: 'Bloqueado', class: 'bg-orange-100 text-orange-700' },
  RetryPending: { label: 'Reintentando', class: 'bg-purple-100 text-purple-700' },
};

const ecfTypeLabels: Record<string, string> = {
  E31: 'Credito Fiscal',
  E32: 'Consumo',
  E33: 'Nota Debito',
  E34: 'Nota Credito',
  E41: 'Compras',
  E43: 'Gastos Menores',
  E44: 'Reg. Especial',
  E45: 'Gubernamental',
  E46: 'Exportacion',
  E47: 'Pagos Exterior',
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<EcfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    api.getDocumentStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getDocuments(page, PAGE_SIZE)
      .then((res) => {
        setDocuments(res.items || []);
        setTotal(res.total || 0);
      })
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filteredDocs = statusFilter === 'all'
    ? documents
    : documents.filter(d => d.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-gray-500 mt-1">Comprobantes fiscales electronicos emitidos</p>
        </div>
        {stats && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Total: <span className="font-semibold text-gray-900">{stats.total}</span></p>
          </div>
        )}
      </div>

      {/* Stats summary */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'bg-gray-50 text-gray-700 border-gray-200' },
            { label: 'Hoy', value: stats.todayCount, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Aceptados', value: stats.accepted, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Pendientes', value: stats.pending, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            { label: 'Rechazados', value: stats.rejected, color: 'bg-red-50 text-red-700 border-red-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border px-4 py-3 ${s.color}`}>
              <p className="text-xs font-medium opacity-75">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 mr-1">Filtrar:</span>
        {[
          { value: 'all', label: 'Todos' },
          { value: 'Accepted', label: 'Aceptados' },
          { value: 'Queued', label: 'En Cola' },
          { value: 'Submitted', label: 'Enviados' },
          { value: 'Rejected', label: 'Rechazados' },
          { value: 'BlockedByConfig', label: 'Bloqueados' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              statusFilter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-1">
              {statusFilter !== 'all' ? 'Sin documentos con ese filtro' : 'Sin documentos'}
            </h3>
            <p>
              {statusFilter !== 'all'
                ? 'Cambia el filtro para ver otros documentos.'
                : 'Los comprobantes apareceran aqui cuando se emitan desde QuickBooks.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">e-NCF</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QBO #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comprador</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDocs.map((doc) => {
                  const st = statusLabels[doc.status] || { label: doc.status, class: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{doc.encf || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{ecfTypeLabels[doc.ecfType] || doc.ecfType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{doc.qboDocNumber || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {doc.buyerName ? (
                          <div>
                            <p className="text-gray-900">{doc.buyerName}</p>
                            {doc.buyerRnc && <p className="text-xs text-gray-400 font-mono">{doc.buyerRnc}</p>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        RD$ {doc.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.class}`}>
                          {st.label}
                        </span>
                        {doc.status === 'Rejected' && doc.errorMessage && (
                          <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={doc.errorMessage}>
                            {doc.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(doc.createdAtUtc).toLocaleDateString('es-DO')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, total)} de {total} documentos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Anterior
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
