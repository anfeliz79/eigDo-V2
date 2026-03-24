'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  type OnboardingStatus,
  type QboSampleRecord,
  type FieldMappingDto,
  type CustomerMapping,
  type DgiiRncResult,
  type ResolveRncResponse,
} from '@/lib/api';

const customerEcfTypes = [
  { value: 'E31', label: 'E31 - Credito Fiscal' },
  { value: 'E32', label: 'E32 - Consumo' },
  { value: 'E44', label: 'E44 - Regimen Especial' },
  { value: 'E45', label: 'E45 - Gubernamental' },
  { value: 'E46', label: 'E46 - Exportacion' },
];

const TARGET_FIELDS = [
  { key: 'Rnc', label: 'RNC / Cedula', description: 'Numero de identificacion fiscal del cliente' },
  { key: 'RazonSocial', label: 'Razon Social DGII', description: 'Nombre oficial registrado en DGII' },
  { key: 'TipoComprobante', label: 'Tipo de Comprobante', description: 'Tipo de e-CF a generar para este cliente' },
];

type RncStatus = 'idle' | 'validating' | 'valid' | 'inactive' | 'not_found' | 'error';

export default function CustomerMappingsPage() {
  const router = useRouter();

  // Sample & field mapping state
  const [sample, setSample] = useState<QboSampleRecord | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMappingDto[]>([]);
  const [loadingSample, setLoadingSample] = useState(true);
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Onboarding
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [sampleSkip, setSampleSkip] = useState(0);

  // Exceptions state
  const [exceptions, setExceptions] = useState<CustomerMapping[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(true);
  const [exceptionsOpen, setExceptionsOpen] = useState(false);
  const [addingException, setAddingException] = useState(false);
  const [exceptionForm, setExceptionForm] = useState<Partial<CustomerMapping>>({ tipoComprobante: 'E32' });
  const [savingException, setSavingException] = useState(false);
  const [rncStatus, setRncStatus] = useState<RncStatus>('idle');
  const [rncResult, setRncResult] = useState<DgiiRncResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveResults, setResolveResults] = useState<{ name: string; result: ResolveRncResponse }[]>([]);
  const [showResolveResults, setShowResolveResults] = useState(false);

  useEffect(() => {
    loadSample();
    loadFieldMappings();
    loadExceptions();
    api.getOnboardingStatus()
      .then((s: OnboardingStatus) => {
        setIsOnboarding(s.currentStep !== 'Complete' && s.completionPercentage < 100);
      })
      .catch(() => {});
  }, []);

  const loadSample = async () => {
    setLoadingSample(true);
    try {
      const data = await api.getQboSample('Customer');
      setSample(data);
    } catch {
      setSample(null);
    } finally {
      setLoadingSample(false);
    }
  };

  const loadFieldMappings = async () => {
    setLoadingMappings(true);
    try {
      const data = await api.getFieldMappings('Customer');
      setFieldMappings(data);
    } catch {
      setFieldMappings([]);
    } finally {
      setLoadingMappings(false);
    }
  };

  const loadExceptions = () => {
    setLoadingExceptions(true);
    api.getCustomerMappings()
      .then(setExceptions)
      .catch(() => setExceptions([]))
      .finally(() => setLoadingExceptions(false));
  };

  const refreshSample = async () => {
    setLoadingSample(true);
    try {
      const data = await api.getQboSample('Customer');
      setSample(data);
    } catch {
      setMessage({ type: 'error', text: 'No se pudo cargar otro registro de ejemplo' });
    } finally {
      setLoadingSample(false);
    }
  };

  // Get the current mapping for a target field
  const getMappingForField = (targetField: string): FieldMappingDto | undefined => {
    return fieldMappings.find(m => m.targetField === targetField);
  };

  // Update a mapping
  const updateMapping = (targetField: string, updates: Partial<FieldMappingDto>) => {
    setFieldMappings(prev => {
      const existing = prev.find(m => m.targetField === targetField);
      if (existing) {
        return prev.map(m => m.targetField === targetField ? { ...m, ...updates } : m);
      }
      return [...prev, { targetField, sourceType: 'QboField' as const, ...updates }];
    });
  };

  // Get preview value from sample
  const getPreviewValue = (mapping: FieldMappingDto | undefined): string | null => {
    if (!mapping || !sample) return null;
    if (mapping.sourceType === 'Fixed') return mapping.fixedValue || null;
    if (mapping.sourceType === 'QboField' && mapping.qboFieldPath) {
      return sample.fields[mapping.qboFieldPath] || null;
    }
    return null;
  };

  const qboFieldOptions = sample ? Object.keys(sample.fields) : [];

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveFieldMappings('Customer', fieldMappings);
      setMessage({ type: 'success', text: 'Configuracion de mapeo guardada correctamente' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    await handleSave();
    try {
      await api.advanceOnboarding('VendorMapping');
    } catch {}
    router.push('/settings/vendors');
  };

  // Exception RNC validation
  const validateExceptionRnc = useCallback(async (rnc: string) => {
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
        setExceptionForm(prev => ({
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

  const saveException = async () => {
    setSavingException(true);
    try {
      await api.saveCustomerMapping(exceptionForm);
      setAddingException(false);
      setExceptionForm({ tipoComprobante: 'E32' });
      setRncStatus('idle');
      setRncResult(null);
      loadExceptions();
      setMessage({ type: 'success', text: 'Excepcion guardada' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar excepcion' });
    } finally {
      setSavingException(false);
    }
  };

  const deleteException = async (id: string) => {
    try {
      await api.deleteCustomerMapping(id);
      loadExceptions();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar' });
    }
  };

  const resolveAllRncs = async () => {
    const unresolved = exceptions.filter(e => !e.rnc && !e.excluido);
    if (unresolved.length === 0) {
      setMessage({ type: 'error', text: 'Todos los clientes ya tienen RNC asignado' });
      return;
    }
    setResolving(true);
    setResolveResults([]);
    setShowResolveResults(true);
    setExceptionsOpen(true);
    const results: { name: string; result: ResolveRncResponse }[] = [];
    for (const exc of unresolved) {
      try {
        const res = await api.resolveRnc(exc.qboDisplayName, exc.qboTaxId);
        results.push({ name: exc.qboDisplayName, result: res });
        if (res.resolved && res.resolvedRnc) {
          await api.saveCustomerMapping({ id: exc.id, rnc: res.resolvedRnc, razonSocialDgii: res.resolvedRazonSocial });
        }
      } catch {
        results.push({ name: exc.qboDisplayName, result: { resolved: false, candidates: [] } });
      }
    }
    setResolveResults(results);
    setResolving(false);
    loadExceptions();
  };

  const loading = loadingSample || loadingMappings;

  return (
    <div className={`${isOnboarding ? 'max-w-2xl mx-auto' : ''} space-y-6`}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mapeo de Clientes</h1>
        <p className="text-gray-500 mt-1">Configura como eigdo lee datos fiscales de tus clientes en QuickBooks</p>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 items-start">
        <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <p className="text-sm text-blue-700">
          Selecciona de cual campo de QuickBooks eigdo debe leer cada dato fiscal. Esta configuracion aplica a <strong>todos</strong> tus clientes automaticamente.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-2xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-500 text-sm mt-4">Cargando datos...</p>
        </div>
      ) : !sample ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-600 mb-2">Sin clientes en QuickBooks</h3>
          <p className="text-sm text-gray-400 mb-4">Sincroniza con QuickBooks para importar tus clientes.</p>
          <button
            onClick={async () => {
              try {
                const result = await api.syncQbo();
                if (result.partial) {
                  setMessage({ type: 'error', text: result.message });
                } else {
                  loadSample();
                  loadExceptions();
                }
              } catch (err) {
                setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al sincronizar' });
              }
            }}
            className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Sincronizar QBO
          </button>
        </div>
      ) : (
        <>
          {/* Sample Record Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{sample.displayName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{sample.displayName}</h3>
                    <p className="text-blue-200 text-sm">Registro de ejemplo desde QBO</p>
                  </div>
                </div>
                <button
                  onClick={refreshSample}
                  disabled={loadingSample}
                  className="px-3 py-1.5 bg-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/30 transition flex items-center gap-1.5"
                >
                  <svg className={`w-4 h-4 ${loadingSample ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                  </svg>
                  Cambiar ejemplo
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {Object.entries(sample.fields).map(([key, value]) => (
                  <div key={key} className="flex items-baseline gap-2 py-1.5 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-500 min-w-[140px]">{key}</span>
                    <span className="text-sm text-gray-900 font-mono">
                      {value || <span className="text-gray-400 italic font-sans">(vacio)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Field Mapping Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Configuracion de campos</h2>

            {TARGET_FIELDS.map(({ key, label, description }) => {
              const mapping = getMappingForField(key);
              const isTipoComprobante = key === 'TipoComprobante';
              const sourceType = mapping?.sourceType || (isTipoComprobante ? 'Fixed' : 'QboField');
              const previewValue = getPreviewValue(mapping);

              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                  </div>

                  {/* Source type toggle for TipoComprobante */}
                  {isTipoComprobante && (
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => updateMapping(key, { sourceType: 'Fixed', qboFieldPath: undefined })}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                          sourceType === 'Fixed'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        Valor fijo
                      </button>
                      <button
                        onClick={() => updateMapping(key, { sourceType: 'QboField', fixedValue: undefined })}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                          sourceType === 'QboField'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        Desde campo QBO
                      </button>
                    </div>
                  )}

                  {/* Dropdown / input */}
                  {sourceType === 'Fixed' && isTipoComprobante ? (
                    <select
                      value={mapping?.fixedValue || 'E32'}
                      onChange={(e) => updateMapping(key, { sourceType: 'Fixed', fixedValue: e.target.value, qboFieldPath: undefined })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition bg-white"
                    >
                      {customerEcfTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={mapping?.qboFieldPath || ''}
                      onChange={(e) => updateMapping(key, { sourceType: 'QboField', qboFieldPath: e.target.value, fixedValue: undefined })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition bg-white"
                    >
                      <option value="">-- Seleccionar campo QBO --</option>
                      {qboFieldOptions.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                  )}

                  {/* Warning for masked TaxIdentifier field */}
                  {key === 'Rnc' && mapping?.qboFieldPath === 'PrimaryTaxIdentifier' && (
                    <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                      <p className="text-xs text-amber-700">
                        Intuit enmascara este campo en su API — solo muestra los ultimos digitos (ej. <span className="font-mono">XXXX-1234</span>). El RNC completo no se puede leer desde QuickBooks. Ingresalo manualmente en cada cliente.
                      </p>
                    </div>
                  )}

                  {/* Preview */}
                  {previewValue !== null && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-gray-500">Vista previa:</span>
                      <span className="text-sm font-mono text-gray-700">&quot;{previewValue}&quot;</span>
                      {previewValue.length > 0 && (
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                  )}
                  {sourceType === 'QboField' && mapping?.qboFieldPath && previewValue === null && (
                    <p className="text-sm text-gray-400 mt-2">Vista previa: <span className="italic">(vacio)</span></p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save button (non-onboarding) */}
          {!isOnboarding && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Guardando...
                </>
              ) : (
                'Guardar configuracion'
              )}
            </button>
          )}

          {/* Exceptions Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setExceptionsOpen(!exceptionsOpen)}
                className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition"
              >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-gray-900">Excepciones</h3>
                  <p className="text-xs text-gray-500">Clientes que necesitan configuracion diferente</p>
                </div>
                {exceptions.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                    {exceptions.length}
                  </span>
                )}
              </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${exceptionsOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={resolveAllRncs}
                disabled={resolving}
                className="ml-3 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition flex items-center gap-1.5 shrink-0"
                title="Buscar RNC automaticamente usando nombre + DGII"
              >
                {resolving ? (
                  <>
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white inline-block" />
                    Resolviendo...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    Resolver RNCs
                  </>
                )}
              </button>
            </div>

            {exceptionsOpen && (
              <div className="border-t border-gray-200 p-6 space-y-4">
                {/* Resolve results panel */}
                {showResolveResults && resolveResults.length > 0 && (
                  <div className="border border-purple-200 rounded-xl p-4 bg-purple-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-purple-800">Resultado de resolucion automatica</p>
                      <button onClick={() => setShowResolveResults(false)} className="text-purple-400 hover:text-purple-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {resolveResults.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        {r.result.resolved ? (
                          <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                          </svg>
                        )}
                        <span className="text-gray-700">
                          <span className="font-medium">{r.name}</span>
                          {r.result.resolved
                            ? <> — RNC: <span className="font-mono">{r.result.resolvedRnc}</span></>
                            : r.result.candidates.length > 0
                              ? <> — {r.result.candidates.length} candidatos, ingresa manualmente</>
                              : <> — No encontrado en DGII</>
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {loadingExceptions ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  </div>
                ) : (
                  <>
                    {exceptions.length > 0 && (
                      <div className="space-y-2">
                        {exceptions.map(ex => (
                          <div key={ex.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{ex.qboDisplayName}</p>
                              <p className="text-xs text-gray-500">
                                RNC: {ex.rnc || 'N/A'} &middot; {ex.tipoComprobante}
                                {ex.excluido && ' · Excluido'}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteException(ex.id)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {addingException ? (
                      <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del cliente (QBO)</label>
                          <input
                            type="text"
                            value={exceptionForm.qboDisplayName || ''}
                            onChange={(e) => setExceptionForm({ ...exceptionForm, qboDisplayName: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition"
                            placeholder="Nombre del cliente en QuickBooks"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">RNC / Cedula</label>
                          <input
                            type="text"
                            value={exceptionForm.rnc || ''}
                            onChange={(e) => setExceptionForm({ ...exceptionForm, rnc: e.target.value })}
                            onBlur={(e) => validateExceptionRnc(e.target.value)}
                            className={`w-full px-4 py-2.5 border rounded-lg text-sm font-mono focus:ring-2 outline-none transition ${
                              rncStatus === 'valid' ? 'border-green-400 bg-green-50 ring-green-200' :
                              rncStatus === 'not_found' ? 'border-red-400 bg-red-50 ring-red-200' :
                              rncStatus === 'inactive' ? 'border-amber-400 bg-amber-50 ring-amber-200' :
                              'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                            }`}
                            placeholder="131000000"
                          />
                          {rncStatus === 'validating' && (
                            <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1.5">
                              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 inline-block" />
                              Validando en DGII...
                            </p>
                          )}
                          {rncStatus === 'valid' && rncResult && (
                            <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                              {rncResult.razonSocial}
                            </p>
                          )}
                          {rncStatus === 'not_found' && (
                            <p className="text-xs text-red-600 mt-1.5">RNC no encontrado en DGII</p>
                          )}
                          {rncStatus === 'inactive' && rncResult && (
                            <p className="text-xs text-amber-600 mt-1.5">{rncResult.razonSocial} (Inactivo)</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Comprobante</label>
                          <select
                            value={exceptionForm.tipoComprobante || 'E32'}
                            onChange={(e) => setExceptionForm({ ...exceptionForm, tipoComprobante: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition bg-white"
                          >
                            {customerEcfTypes.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveException}
                            disabled={savingException}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition"
                          >
                            {savingException ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => {
                              setAddingException(false);
                              setExceptionForm({ tipoComprobante: 'E32' });
                              setRncStatus('idle');
                              setRncResult(null);
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingException(true)}
                        className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Agregar excepcion
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Navigation for onboarding */}
      {isOnboarding && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => router.push('/onboarding')}
            className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-900 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Anterior
          </button>
          <button
            onClick={handleContinue}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Guardando...
              </>
            ) : (
              <>
                Continuar
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
