'use client';

import { useEffect, useState } from 'react';
import { api, type TaxMapping } from '@/lib/api';

const billingLabels: Record<number, string> = {
  0: 'No Facturable (Exento)',
  1: 'ITBIS 18%',
  2: 'ITBIS 16%',
  3: 'ITBIS 0%',
  4: 'Regimen Especial',
};

export default function TaxMappingsPage() {
  const [mappings, setMappings] = useState<TaxMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTaxMappings()
      .then(setMappings)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mapeo de Impuestos</h1>
        <p className="text-gray-500 mt-1">Ciclo 4: Asocia Tax Codes de QuickBooks con indicadores de facturacion DGII</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Importante:</strong> eigdo NUNCA usa los montos de impuesto de QuickBooks. Solo usa el Tax Code para determinar el indicador de facturacion (BillingIndicator) y calcula el ITBIS internamente.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : mappings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin impuestos mapeados</h3>
            <p>Conecta QuickBooks para sincronizar tus Tax Codes automaticamente.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Code QBO</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tasa QBO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indicador Facturacion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.qboTaxCodeName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">{m.qboTaxRate != null ? `${m.qboTaxRate}%` : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      m.billingIndicator === 1 ? 'bg-blue-100 text-blue-700' :
                      m.billingIndicator === 2 ? 'bg-indigo-100 text-indigo-700' :
                      m.billingIndicator === 0 ? 'bg-gray-100 text-gray-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {billingLabels[m.billingIndicator] || `Indicador ${m.billingIndicator}`}
                    </span>
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
