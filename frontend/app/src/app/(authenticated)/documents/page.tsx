'use client';

import { useEffect, useState } from 'react';
import { api, type EcfDocument } from '@/lib/api';

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

  useEffect(() => {
    setLoading(true);
    api.getDocuments(page)
      .then((res) => {
        setDocuments(res.items || []);
        setTotal(res.total || 0);
      })
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-gray-500 mt-1">Comprobantes fiscales electronicos emitidos</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin documentos</h3>
            <p>Los comprobantes apareceran aqui cuando se emitan desde QuickBooks.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">e-NCF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QBO #</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => {
                const st = statusLabels[doc.status] || { label: doc.status, class: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{doc.encf || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ecfTypeLabels[doc.ecfType] || doc.ecfType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.qboDocNumber || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      RD$ {doc.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.class}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(doc.createdAtUtc).toLocaleDateString('es-DO')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
