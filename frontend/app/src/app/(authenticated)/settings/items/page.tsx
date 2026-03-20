'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type ItemOverride, type OnboardingStatus } from '@/lib/api';

const goodServiceOptions = [
  { value: 0, label: 'Default (usar configuracion fiscal)' },
  { value: 1, label: 'Bien' },
  { value: 2, label: 'Servicio' },
];

export default function ItemOverridesPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItemOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ItemOverride>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    loadItems();
    api.getOnboardingStatus()
      .then((s: OnboardingStatus) => {
        setIsOnboarding(s.currentStep !== 'Complete' && s.completionPercentage < 100);
      })
      .catch(() => {});
  }, []);

  const loadItems = () => {
    setLoading(true);
    api.getItemOverrides()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      await api.syncQbo();
      setMessage({ type: 'success', text: 'Items sincronizados desde QuickBooks' });
      loadItems();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al sincronizar' });
    } finally {
      setSyncing(false);
    }
  };

  const startEdit = (item: ItemOverride) => {
    setEditing(item.id);
    setEditForm({ ...item });
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
      await api.saveItemOverride(editForm);
      setMessage({ type: 'success', text: 'Override actualizado' });
      setEditing(null);
      loadItems();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    // ItemOverrides is step 6 → next is CertificateUpload (7)
    try {
      await api.advanceOnboarding('CertificateUpload');
    } catch {}
    router.push('/onboarding');
  };

  const handleSkip = async () => {
    // Skip this optional step — advance to next
    try {
      await api.advanceOnboarding('CertificateUpload');
    } catch {}
    router.push('/onboarding');
  };

  const overridesConfigured = items.filter(i => i.unitMeasureOverride || i.goodServiceIndicatorOverride).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overrides de Items</h1>
          <p className="text-gray-500 mt-1">Ciclo 5: Personaliza unidad de medida y tipo bien/servicio por item</p>
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

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
        <strong>Paso opcional:</strong> Solo necesitas overrides cuando un item especifico requiere valores distintos a los defaults configurados en tus datos fiscales. La mayoria de empresas pueden omitir este paso.
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          <strong>{items.length}</strong> items importados. <strong>{overridesConfigured}</strong> con overrides configurados.
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
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin items importados</h3>
            <p className="mb-4">Haz clic en &quot;Sincronizar QBO&quot; para importar items, o salta este paso si no necesitas overrides.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-green-400 transition"
              >
                {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
              {isOnboarding && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Saltar este paso
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item QBO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad de Medida</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bien/Servicio</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {editing === item.id ? (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.qboItemName}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            value={editForm.unitMeasureOverride ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, unitMeasureOverride: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Codigo"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.goodServiceIndicatorOverride ?? 0}
                            onChange={(e) => setEditForm({ ...editForm, goodServiceIndicatorOverride: Number(e.target.value) || undefined })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            {goodServiceOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
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
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.qboItemName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.unitMeasureOverride ? (
                            <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono">{item.unitMeasureOverride}</span>
                          ) : (
                            <span className="text-gray-400">Default</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.goodServiceIndicatorOverride === 1 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Bien</span>
                          ) : item.goodServiceIndicatorOverride === 2 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">Servicio</span>
                          ) : (
                            <span className="text-gray-400">Default</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => startEdit(item)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
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
            onClick={() => router.push('/settings/taxes')}
            className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-900 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver a Impuestos
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Saltar
            </button>
            <button
              onClick={handleContinue}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              Continuar
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
