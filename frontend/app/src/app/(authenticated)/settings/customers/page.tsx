'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, type CustomerMapping, type OnboardingStatus, type DgiiRncResult } from '@/lib/api';

const ecfTypes = [
  { value: 'E31', label: 'E31 - Credito Fiscal' },
  { value: 'E32', label: 'E32 - Consumo' },
  { value: 'E34', label: 'E34 - Nota de Credito' },
  { value: 'E44', label: 'E44 - Regimen Especial' },
  { value: 'E45', label: 'E45 - Gubernamental' },
  { value: 'E46', label: 'E46 - Exportacion' },
];

type RncStatus = 'idle' | 'validating' | 'valid' | 'inactive' | 'not_found' | 'error';

export default function CustomerMappingsPage() {
  const router = useRouter();
  const [mappings, setMappings] = useState<CustomerMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CustomerMapping>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [rncStatus, setRncStatus] = useState<RncStatus>('idle');
  const [rncResult, setRncResult] = useState<DgiiRncResult | null>(null);

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
    api.getCustomerMappings()
      .then(setMappings)
      .catch(() => setMappings([]))
      .finally(() => setLoading(false));
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      await api.syncQbo();
      setMessage({ type: 'success', text: 'Datos sincronizados desde QuickBooks' });
      loadMappings();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al sincronizar' });
    } finally {
      setSyncing(false);
    }
  };

  const startEdit = (m: CustomerMapping) => {
    setEditing(m.id);
    setEditForm({ ...m });
    setMessage(null);
    setRncStatus('idle');
    setRncResult(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({});
    setRncStatus('idle');
    setRncResult(null);
  };

  const validateRnc = useCallback(async (rnc: string) => {
    const cleaned = rnc.replace(/[-\s]/g, '');
    if (cleaned.length < 9) {
      setRncStatus('idle');
      setRncResult(null);
      return;
    }
    setRncStatus('validating');
    try {
      const result = await api.lookupRnc(cleaned);
      setRncResult(result);
      if (result.esActivo) {
        setRncStatus('valid');
        setEditForm(prev => ({
          ...prev,
          rnc: result.rnc,
          razonSocialDgii: result.razonSocial,
        }));
      } else {
        setRncStatus('inactive');
      }
    } catch {
      setRncStatus('not_found');
      setRncResult(null);
    }
  }, []);

  const saveEdit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveCustomerMapping(editForm);
      setMessage({ type: 'success', text: 'Cliente actualizado' });
      setEditing(null);
      setRncStatus('idle');
      setRncResult(null);
      loadMappings();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    try {
      await api.advanceOnboarding('VendorMapping');
    } catch {}
    router.push('/settings/vendors');
  };

  // Count unmapped (no RNC) and non-excluded
  const unmappedCount = mappings.filter(m => !m.excluido && !m.rnc).length;
  const totalActive = mappings.filter(m => !m.excluido).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapeo de Clientes</h1>
          <p className="text-gray-500 mt-1">Ciclo 2: Asocia clientes de QuickBooks con datos fiscales DGII</p>
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

      {/* Progress summary */}
      {mappings.length > 0 && (
        <div className={`px-4 py-3 rounded-lg text-sm border ${
          unmappedCount === 0
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {unmappedCount === 0 ? (
            <span><strong>{totalActive}</strong> clientes activos mapeados correctamente.</span>
          ) : (
            <span><strong>{unmappedCount}</strong> de {totalActive} clientes activos sin RNC. Edita cada cliente para asignar su RNC o marcalo como excluido.</span>
          )}
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin clientes mapeados</h3>
            <p className="mb-4">Haz clic en &quot;Sincronizar QBO&quot; para importar clientes desde QuickBooks.</p>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente QBO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RNC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razon Social DGII</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo e-CF</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Excluido</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappings.map((m) => (
                  <tr key={m.id} className={`hover:bg-gray-50 ${!m.excluido && !m.rnc ? 'bg-amber-50/50' : ''}`}>
                    {editing === m.id ? (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.qboDisplayName}</td>
                        <td className="px-4 py-2">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editForm.rnc || ''}
                              onChange={(e) => setEditForm({ ...editForm, rnc: e.target.value })}
                              onBlur={(e) => validateRnc(e.target.value)}
                              className={`w-full px-2 py-1.5 border rounded text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none ${
                                rncStatus === 'valid' ? 'border-green-400 bg-green-50' :
                                rncStatus === 'not_found' ? 'border-red-400 bg-red-50' :
                                rncStatus === 'inactive' ? 'border-amber-400 bg-amber-50' :
                                'border-gray-300'
                              }`}
                              placeholder="131000000"
                            />
                            {rncStatus === 'validating' && (
                              <p className="text-xs text-blue-600">Validando en DGII...</p>
                            )}
                            {rncStatus === 'valid' && rncResult && (
                              <p className="text-xs text-green-600">
                                {rncResult.razonSocial}
                              </p>
                            )}
                            {rncStatus === 'not_found' && (
                              <p className="text-xs text-red-600">RNC no encontrado en DGII</p>
                            )}
                            {rncStatus === 'inactive' && rncResult && (
                              <p className="text-xs text-amber-600">
                                {rncResult.razonSocial} (Inactivo)
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.razonSocialDgii || ''}
                            onChange={(e) => setEditForm({ ...editForm, razonSocialDgii: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Nombre en DGII"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.tipoComprobante || 'E32'}
                            onChange={(e) => setEditForm({ ...editForm, tipoComprobante: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            {ecfTypes.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={editForm.excluido || false}
                            onChange={(e) => setEditForm({ ...editForm, excluido: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
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
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.qboDisplayName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{m.rnc || <span className="text-orange-500 font-sans">Sin RNC</span>}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.razonSocialDgii || <span className="text-gray-400">&mdash;</span>}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.tipoComprobante}</td>
                        <td className="px-4 py-3 text-center">
                          {m.excluido ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Si</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">No</span>
                          )}
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
            onClick={() => router.push('/onboarding')}
            className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-900 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver al Onboarding
          </button>
          <button
            onClick={handleContinue}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            Continuar a Proveedores
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
