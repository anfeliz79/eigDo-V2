'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type TaxMapping, type OnboardingStatus } from '@/lib/api';

const billingIndicators = [
  { value: 0, label: 'Exento' },
  { value: 1, label: 'ITBIS 18%' },
  { value: 2, label: 'ITBIS 16%' },
  { value: 3, label: 'ITBIS 0%' },
];

const billingColors: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-indigo-100 text-indigo-700',
  3: 'bg-yellow-100 text-yellow-700',
};

export default function TaxMappingsPage() {
  const router = useRouter();
  const [mappings, setMappings] = useState<TaxMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, number>>({});

  useEffect(() => {
    loadMappings();
    api.getOnboardingStatus()
      .then((s: OnboardingStatus) => {
        setIsOnboarding(s.currentStep !== 'Complete' && s.completionPercentage < 100);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const values: Record<string, number> = {};
    mappings.forEach(m => {
      values[m.id] = m.billingIndicator;
    });
    setLocalValues(values);
  }, [mappings]);

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
      const result = await api.syncQbo();
      setMessage({ type: result.partial ? 'error' : 'success', text: result.message });
      if (!result.partial) loadMappings();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al sincronizar' });
    } finally {
      setSyncing(false);
    }
  };

  const saveTaxCard = async (m: TaxMapping, billingIndicator: number) => {
    setSaving(m.id);
    setMessage(null);
    try {
      await api.saveTaxMapping({ ...m, billingIndicator });
      setMessage({ type: 'success', text: `${m.qboTaxCodeName} actualizado` });
      loadMappings();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(null);
    }
  };

  const handleContinue = async () => {
    try {
      await api.advanceOnboarding('ItemOverrides');
    } catch {}
    router.push('/settings/items');
  };

  const mappedCount = mappings.filter(m => m.billingIndicator !== undefined && m.billingIndicator !== null).length;
  const totalCount = mappings.length;
  const allMapped = totalCount > 0 && mappedCount === totalCount;

  return (
    <div className={`space-y-6 ${isOnboarding ? 'max-w-2xl mx-auto' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapeo de Impuestos</h1>
          <p className="text-gray-500 mt-1">Asocia Tax Codes de QuickBooks con indicadores de facturacion DGII</p>
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

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 items-start">
        <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-sm text-blue-700">
          Debes mapear <strong>TODOS</strong> los impuestos. eigdo recalcula el ITBIS, nunca usa los montos de QBO.
        </p>
      </div>

      {mappings.length > 0 && (
        <div className={`px-4 py-3 rounded-2xl text-sm border flex items-center justify-between ${
          allMapped
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          <span>
            {allMapped ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Todos los impuestos mapeados
              </span>
            ) : (
              <span><strong>{mappedCount}</strong> de <strong>{totalCount}</strong> impuestos mapeados</span>
            )}
          </span>
          <div className="w-32 h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allMapped ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: totalCount > 0 ? `${(mappedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {message && (
        <div className={`px-4 py-3 rounded-2xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-500 text-sm mt-4">Cargando impuestos...</p>
        </div>
      ) : mappings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-600 mb-2">Sin impuestos importados</h3>
          <p className="text-sm text-gray-400 mb-4">Sincroniza con QuickBooks para importar Tax Codes.</p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:bg-green-400 transition inline-flex items-center gap-2"
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
      ) : (
        <div className="space-y-3">
          {mappings.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <svg className="w-4.5 h-4.5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{m.qboTaxCodeName}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {m.qboTaxRate != null ? `Tasa QBO: ${m.qboTaxRate}%` : 'Sin tasa definida en QBO'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={localValues[m.id] ?? m.billingIndicator}
                    onChange={(e) => {
                      const newValue = Number(e.target.value);
                      setLocalValues(prev => ({ ...prev, [m.id]: newValue }));
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition bg-white min-w-[160px]"
                  >
                    {billingIndicators.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>

                  {(localValues[m.id] !== undefined && localValues[m.id] !== m.billingIndicator) ? (
                    <button
                      onClick={() => saveTaxCard(m, localValues[m.id])}
                      disabled={saving === m.id}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition min-w-[80px] flex items-center justify-center"
                    >
                      {saving === m.id ? (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                      ) : (
                        'Guardar'
                      )}
                    </button>
                  ) : (
                    <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-medium min-w-[80px] justify-center ${billingColors[m.billingIndicator] || 'bg-gray-100 text-gray-600'}`}>
                      {billingIndicators.find(b => b.value === m.billingIndicator)?.label || `Ind. ${m.billingIndicator}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOnboarding && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => router.push('/settings/vendors')}
            className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-900 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Anterior
          </button>
          <button
            onClick={handleContinue}
            disabled={!allMapped}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            Continuar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
