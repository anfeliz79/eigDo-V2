'use client';

import { useEffect, useState } from 'react';
import { api, type CustomerMapping } from '@/lib/api';

const ecfTypes = [
  { value: 'E31', label: 'E31 - Credito Fiscal' },
  { value: 'E32', label: 'E32 - Consumo' },
  { value: 'E34', label: 'E34 - Nota de Credito' },
  { value: 'E44', label: 'E44 - Regimen Especial' },
  { value: 'E45', label: 'E45 - Gubernamental' },
  { value: 'E46', label: 'E46 - Exportacion' },
];

export default function CustomerMappingsPage() {
  const [mappings, setMappings] = useState<CustomerMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCustomerMappings()
      .then(setMappings)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mapeo de Clientes</h1>
        <p className="text-gray-500 mt-1">Ciclo 2: Asocia clientes de QuickBooks con datos fiscales DGII</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : mappings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin clientes mapeados</h3>
            <p>Conecta QuickBooks para sincronizar tus clientes automaticamente.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente QBO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RNC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razon Social</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo e-CF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.qboDisplayName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{m.rnc || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.razonSocialDgii || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.tipoComprobante}</td>
                  <td className="px-6 py-4">
                    {m.excluido ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Excluido</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Activo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
