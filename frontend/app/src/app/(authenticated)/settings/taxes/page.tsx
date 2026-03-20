'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type TaxMapping, type OnboardingStatus } from '@/lib/api';

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
  const router = useRouter();
  const [mappings, setMappings] = useState<TaxMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TaxMapping>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    loadMappings();
    api.getOnboardingStatus()
      .then((s: OnboardingStatus) => {
        setIsOnboarding(s.currentStep !== 'Complete' && s.completionPercentage < 100);
      })
      .catch(() => {});
  }, []);

  const loadMappings = () => {
    setLoading(true);
    api.getTaxMappings()
      .then(setMappings)
      .catch(() => setMappings([]))
      .finally(() => setLoading(false));
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      await api.syncQbo();
      setMessage({ type: 'success', text: 'Tax Codes sincronizados desde QuickBooks' });
      loadMappings();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al sincronizar' });
    } finally {
      setSyncing(false);
    }
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

  const handleContinue = async () => {
    try {
      await api.advanceOnboarding('ItemOverrides');
    } catch {}
    router.push('/settings/items');
  };

  // Check if all tax codes have been reviewed (have a non-default mapping)
  const allMapped = mappings.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapeo de Impuestos</h1>
          <p className="text-gray-500 mt-1">Ciclo 4: Asocia Tax Codes de QuickBooks con indicadores de facturacion DGII</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-green-400 transition flex items-center gap-2"
        >
          {syncing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          )}
          {syncing ? 'Sincronizando...' : 'Sincronizar QBO'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Importante:</strong> eigdo NUNCA usa los montos de impuesto de QuickBooks. Solo usa el Tax Code para determinar el indicador de facturacion (BillingIndicator) y calcula el ITBIS internamente.
      </div>

      {/* Progress */}
      {mappings.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          <strong>{mappings.length}</strong> Tax Codes mapeados. Verifica que cada uno tenga el indicador de facturacion correcto.
        </div>
      )}

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
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin impuestos mapeados</h3>
            <p className="mb-4">Haz clic en &quot;Sincronizar QBO&quot; para importar Tax Codes desde QuickBooks.</p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-green-400 transition"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
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

      {/* Onboarding navigation */}
      {isOnboarding && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => router.push('/settings/vendors')}
            className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-900 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver a Proveedores
          </button>
          <button
            onClick={handleContinue}
            disabled={!allMapped}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            Continuar a Items
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
