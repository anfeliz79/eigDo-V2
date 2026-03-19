'use client';

import { useEffect, useState } from 'react';
import { api, type TaxMapping } from '@/lib/api';

const billingIndicators = [
  { value: 0, label: 'No Facturable (Exento)' },
  { value: 1, label: 'ITBIS 18%' },
  { value: 2, label: 'ITBIS 16%' },
  { value: 3, label: 'ITBIS 0%' },
  { value: 4, label: 'Regimen Especial' },
];

const billingLabels: Record<number, string> = Object.fromEntries(
  billingIndicators.map((b) => [b.value, b.label])
);

const billingColors: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-indigo-100 text-indigo-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-purple-100 text-purple-700',
};

export default function TaxMappingsPage() {
  const [mappings, setMappings] = useState<TaxMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TaxMapping>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = () => {
    setLoading(true);
    api.getTaxMappings()
      .then(setMappings)
      .catch(() => setMappings([]))
      .finally(() => setLoading(false));
  };

  const startEdit = (m: TaxMapping) => {
    setEditing(m.id);
    setEditForm({ ...m });
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveTaxMapping(editForm);
      setMessage({ type: 'success', text: 'Mapeo de impuesto actualizado' });
      setEditing(null);
      loadMappings();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mapeo de Impuestos</h1>
        <p className="text-gray-500 mt-1">Ciclo 4: Asocia Tax Codes de QuickBooks con indicadores de facturacion DGII</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Importante:</strong> eigdo NUNCA usa los montos de impuesto de QuickBooks. Solo usa el Tax Code para determinar el indicador de facturacion (BillingIndicator) y calcula el ITBIS internamente.
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : mappings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin impuestos mapeados</h3>
            <p>Conecta QuickBooks para sincronizar tus Tax Codes automaticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Code QBO</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tasa QBO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indicador Facturacion</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    {editing === m.id ? (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.qboTaxCodeName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{m.qboTaxRate != null ? `${m.qboTaxRate}%` : <span className="text-gray-400">&mdash;</span>}</td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.billingIndicator ?? 1}
                            onChange={(e) => setEditForm({ ...editForm, billingIndicator: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            {billingIndicators.map((b) => (
                              <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                          <button onClick={saveEdit} disabled={saving} className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:bg-blue-400 transition">
                            {saving ? '...' : 'Guardar'}
                          </button>
                          <button onClick={cancelEdit} className="px-3 py-1 border border-gray-300 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition">
                            Cancelar
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.qboTaxCodeName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{m.qboTaxRate != null ? `${m.qboTaxRate}%` : <span className="text-gray-400">&mdash;</span>}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${billingColors[m.billingIndicator] || 'bg-gray-100 text-gray-600'}`}>
                            {billingLabels[m.billingIndicator] || `Indicador ${m.billingIndicator}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => startEdit(m)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Editar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
