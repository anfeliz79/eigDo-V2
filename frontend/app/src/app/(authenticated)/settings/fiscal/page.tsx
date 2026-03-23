'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, type FiscalSettings, type QboCompanyInfo, type DgiiRncResult, type CertificationAssistanceConfig } from '@/lib/api';

// Maps QBO fields to fiscal settings fields
const QBO_FIELD_MAP: { fiscalField: keyof FiscalSettings; qboField: keyof QboCompanyInfo; label: string }[] = [
  { fiscalField: 'rnc', qboField: 'ein', label: 'RNC / Cedula' },
  { fiscalField: 'razonSocial', qboField: 'legalName', label: 'Razon Social' },
  { fiscalField: 'nombreComercial', qboField: 'companyName', label: 'Nombre Comercial' },
  { fiscalField: 'telefono', qboField: 'phone', label: 'Telefono' },
  { fiscalField: 'email', qboField: 'email', label: 'Correo Electronico' },
  { fiscalField: 'direccion', qboField: 'fullAddress', label: 'Direccion' },
];

type RncValidationState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'valid'; data: DgiiRncResult }
  | { status: 'inactive'; data: DgiiRncResult }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

export default function FiscalSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<Partial<FiscalSettings>>({});
  const [qboInfo, setQboInfo] = useState<QboCompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQbo, setLoadingQbo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // RNC validation
  const [rncValidation, setRncValidation] = useState<RncValidationState>({ status: 'idle' });
  const lastValidatedRnc = useRef<string>('');

  // Certification assistance
  const [showAssistanceModal, setShowAssistanceModal] = useState(false);
  const [assistanceConfig, setAssistanceConfig] = useState<CertificationAssistanceConfig | null>(null);

  useEffect(() => {
    Promise.all([
      api.getFiscalSettings()
        .then(setForm)
        .catch(() => {}),
      api.getQboCompanyInfo()
        .then(setQboInfo)
        .catch(() => setQboInfo(null)),
      // Check if we're in onboarding mode (not complete yet)
      api.getOnboardingStatus()
        .then(status => {
          if (status.currentStep !== 'Complete' && status.completionPercentage < 100) {
            setIsOnboarding(true);
          }
        })
        .catch(() => {}),
    ]).finally(() => {
      setLoading(false);
      setLoadingQbo(false);
    });
  }, []);

  // Validate RNC against DGII
  const validateRnc = useCallback(async (rnc: string) => {
    const cleaned = rnc.replace(/[-\s]/g, '').trim();

    if (cleaned.length < 9) {
      setRncValidation({ status: 'idle' });
      lastValidatedRnc.current = '';
      return;
    }

    // Don't re-validate the same RNC
    if (cleaned === lastValidatedRnc.current) return;
    lastValidatedRnc.current = cleaned;

    setRncValidation({ status: 'validating' });

    try {
      const result = await api.lookupRnc(cleaned);

      if (result.esActivo) {
        setRncValidation({ status: 'valid', data: result });

        // Auto-fill razonSocial from DGII if currently empty
        setForm(prev => {
          const updates: Partial<FiscalSettings> = {};
          if (!prev.razonSocial && result.razonSocial) {
            updates.razonSocial = result.razonSocial;
          }
          if (!prev.nombreComercial && result.nombreComercial) {
            updates.nombreComercial = result.nombreComercial;
          }
          return { ...prev, ...updates };
        });
      } else {
        setRncValidation({ status: 'inactive', data: result });
        // Fetch certification assistance config when RNC is not active
        try {
          const config = await api.getCertificationAssistance();
          setAssistanceConfig(config);
        } catch {
          setAssistanceConfig(null);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al validar';
      if (errorMsg.includes('No se encontro') || errorMsg.includes('404')) {
        setRncValidation({ status: 'not_found' });
      } else {
        setRncValidation({ status: 'error', message: errorMsg });
      }
    }
  }, []);

  const handleSave = async (andContinue = false) => {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveFiscalSettings(form);

      if (andContinue && isOnboarding) {
        // Try to advance from QboConnection → CompanyData first, then CompanyData → CustomerMapping
        try {
          await api.advanceOnboarding('CompanyData');
        } catch {
          // Already at CompanyData or beyond, try next
        }
        try {
          await api.advanceOnboarding('CustomerMapping');
        } catch {
          // May not be ready yet
        }
        router.push('/onboarding');
        return;
      } else {
        setMessage({ type: 'success', text: 'Datos fiscales guardados correctamente' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const applyQboValue = (fiscalField: keyof FiscalSettings, value: string) => {
    setForm(prev => ({ ...prev, [fiscalField]: value }));
    // If applying QBO value to RNC, trigger validation
    if (fiscalField === 'rnc') {
      validateRnc(value);
    }
  };

  const applyAllQbo = () => {
    if (!qboInfo) return;
    const updates: Partial<FiscalSettings> = {};
    for (const mapping of QBO_FIELD_MAP) {
      const qboValue = qboInfo[mapping.qboField];
      if (qboValue && !form[mapping.fiscalField]) {
        (updates as any)[mapping.fiscalField] = qboValue;
      }
    }
    setForm(prev => ({ ...prev, ...updates }));
    // If RNC was applied, validate it
    if (updates.rnc) {
      validateRnc(updates.rnc);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  const hasQboData = qboInfo && Object.values(qboInfo).some(v => v);
  const hasEmptyFields = QBO_FIELD_MAP.some(m => {
    const qboVal = qboInfo?.[m.qboField];
    const formVal = form[m.fiscalField];
    return qboVal && !formVal;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Datos Fiscales</h1>
        <p className="text-gray-500 mt-1">Informacion del emisor (Ciclo 1)</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* QBO data banner */}
      {hasQboData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">Datos de QuickBooks disponibles</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Haz clic en &quot;Usar dato QBO&quot; en cada campo, o aplica todos los vacios de una vez.
                </p>
              </div>
            </div>
            {hasEmptyFields && (
              <button
                onClick={applyAllQbo}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition shrink-0"
              >
                Aplicar todos
              </button>
            )}
          </div>
        </div>
      )}

      {loadingQbo && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-600">Cargando datos de QuickBooks...</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Identidad del Emisor</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* RNC field with DGII validation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">RNC / Cedula</label>
            <div className="relative">
              <input
                type="text"
                value={form.rnc || ''}
                onChange={(e) => setForm({ ...form, rnc: e.target.value })}
                onBlur={(e) => validateRnc(e.target.value)}
                placeholder="131000000"
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition text-sm ${
                  rncValidation.status === 'valid' ? 'border-green-400 focus:ring-green-500' :
                  rncValidation.status === 'inactive' || rncValidation.status === 'not_found' ? 'border-red-400 focus:ring-red-500' :
                  'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {rncValidation.status === 'validating' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                </div>
              )}
              {rncValidation.status === 'valid' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
              )}
              {(rncValidation.status === 'inactive' || rncValidation.status === 'not_found') && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
              )}
            </div>

            {/* DGII Validation Result */}
            <RncValidationDisplay
              validation={rncValidation}
              onRequestAssistance={() => setShowAssistanceModal(true)}
            />

            {/* QBO suggestion for RNC */}
            {qboInfo?.ein && qboInfo.ein !== form.rnc && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600 truncate" title={qboInfo.ein}>
                    <span className="font-medium">EIN:</span> {qboInfo.ein}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applyQboValue('rnc', qboInfo.ein!)}
                  className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded transition shrink-0"
                >
                  Usar dato QBO
                </button>
              </div>
            )}
            {qboInfo?.ein && qboInfo.ein === form.rnc && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Dato desde QuickBooks
              </p>
            )}
          </div>

          <MappableField
            label="Razon Social"
            value={form.razonSocial || ''}
            onChange={(v) => setForm({ ...form, razonSocial: v })}
            placeholder="Mi Empresa SRL"
            qboValue={qboInfo?.legalName}
            onApplyQbo={(v) => applyQboValue('razonSocial', v)}
            dgiiValue={rncValidation.status === 'valid' ? rncValidation.data.razonSocial : undefined}
          />
          <MappableField
            label="Nombre Comercial"
            value={form.nombreComercial || ''}
            onChange={(v) => setForm({ ...form, nombreComercial: v })}
            placeholder="Mi Marca"
            qboValue={qboInfo?.companyName}
            onApplyQbo={(v) => applyQboValue('nombreComercial', v)}
            dgiiValue={rncValidation.status === 'valid' ? rncValidation.data.nombreComercial : undefined}
          />
          <MappableField
            label="Telefono"
            value={form.telefono || ''}
            onChange={(v) => setForm({ ...form, telefono: v })}
            placeholder="809-555-1234"
            qboValue={qboInfo?.phone}
            onApplyQbo={(v) => applyQboValue('telefono', v)}
          />
          <MappableField
            label="Correo Electronico"
            value={form.email || ''}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder="fiscal@empresa.com"
            qboValue={qboInfo?.email}
            onApplyQbo={(v) => applyQboValue('email', v)}
            className="md:col-span-2"
          />
          <MappableField
            label="Direccion"
            value={form.direccion || ''}
            onChange={(v) => setForm({ ...form, direccion: v })}
            placeholder="Calle Principal #1, Santo Domingo"
            qboValue={qboInfo?.legalFullAddress || qboInfo?.fullAddress}
            qboLabel={qboInfo?.legalFullAddress ? 'Direccion Legal QBO' : 'Direccion QBO'}
            onApplyQbo={(v) => applyQboValue('direccion', v)}
            className="md:col-span-2"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Valores por Defecto</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SelectField
            label="Tipo de Ingreso"
            value={String(form.defaultIncomeType || 1)}
            onChange={(v) => setForm({ ...form, defaultIncomeType: Number(v) })}
            options={[
              { value: '1', label: '01 - Ingresos por operaciones no financieras' },
              { value: '2', label: '02 - Ingresos financieros' },
              { value: '3', label: '03 - Ingresos extraordinarios' },
              { value: '4', label: '04 - Ingresos por arrendamientos' },
              { value: '5', label: '05 - Ingresos por venta de activos' },
              { value: '6', label: '06 - Otros ingresos' },
            ]}
          />
          <SelectField
            label="Indicador Bien/Servicio"
            value={String(form.defaultGoodServiceIndicator || 2)}
            onChange={(v) => setForm({ ...form, defaultGoodServiceIndicator: Number(v) })}
            options={[
              { value: '1', label: '1 - Bien' },
              { value: '2', label: '2 - Servicio' },
            ]}
          />
          <SelectField
            label="Unidad de Medida (por defecto)"
            value={String(form.defaultUnitMeasure || 43)}
            onChange={(v) => setForm({ ...form, defaultUnitMeasure: Number(v) })}
            options={[
              { value: '43', label: '43 - Unidad' },
              { value: '4', label: '04 - Libra' },
              { value: '18', label: '18 - Galon' },
              { value: '32', label: '32 - Metro cuadrado' },
              { value: '36', label: '36 - Hora' },
            ]}
          />
          <SelectField
            label="Sin Tax Code = ?"
            value={String(form.defaultNoTaxCodeBillingIndicator || 0)}
            onChange={(v) => setForm({ ...form, defaultNoTaxCodeBillingIndicator: Number(v) })}
            options={[
              { value: '0', label: '0 - No facturable (exento)' },
              { value: '1', label: '1 - ITBIS 18%' },
              { value: '2', label: '2 - ITBIS 16%' },
              { value: '3', label: '3 - ITBIS 0%' },
              { value: '4', label: '4 - Regimen especial' },
            ]}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className={`px-6 py-2.5 font-semibold rounded-lg transition ${
            isOnboarding
              ? 'bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700'
              : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white'
          }`}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        {isOnboarding && (
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !form.rnc || !form.razonSocial}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition flex items-center gap-2"
          >
            {saving ? 'Guardando...' : 'Guardar y Continuar'}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        )}
      </div>

      {/* Certification Assistance Modal */}
      {showAssistanceModal && assistanceConfig && (
        <CertificationAssistanceModal
          config={assistanceConfig}
          rncData={rncValidation.status === 'inactive' ? rncValidation.data : null}
          onClose={() => setShowAssistanceModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Displays RNC validation results from DGII.
 */
function RncValidationDisplay({ validation, onRequestAssistance }: {
  validation: RncValidationState;
  onRequestAssistance: () => void;
}) {
  if (validation.status === 'idle' || validation.status === 'validating') return null;

  if (validation.status === 'valid') {
    return (
      <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-sm font-medium text-green-800">RNC verificado en DGII</span>
          <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            {validation.data.estado}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1 text-xs text-green-700">
          <p><span className="font-medium">Razon Social:</span> {validation.data.razonSocial}</p>
          {validation.data.nombreComercial && (
            <p><span className="font-medium">Nombre Comercial:</span> {validation.data.nombreComercial}</p>
          )}
          {validation.data.actividadEconomica && (
            <p><span className="font-medium">Actividad:</span> {validation.data.actividadEconomica}</p>
          )}
          {validation.data.regimenPagos && (
            <p><span className="font-medium">Regimen:</span> {validation.data.regimenPagos}</p>
          )}
          <p>
            <span className="font-medium">Facturador Electronico:</span>{' '}
            {validation.data.esFacturadorElectronico ? 'Si' : 'No'}
          </p>
        </div>
      </div>
    );
  }

  if (validation.status === 'inactive') {
    return (
      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-sm font-medium text-amber-800">RNC no esta activo en DGII</span>
          <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
            {validation.data.estado}
          </span>
        </div>
        <div className="text-xs text-amber-700">
          <p><span className="font-medium">Razon Social:</span> {validation.data.razonSocial}</p>
        </div>
        <div className="bg-amber-100/50 rounded p-2 text-xs text-amber-800">
          <p className="font-medium mb-1">
            Este RNC se encuentra en estado &quot;{validation.data.estado}&quot;. Para emitir comprobantes electronicos, debe estar en estado ACTIVO.
          </p>
          <p>Debe regularizar su situacion ante la DGII antes de poder emitir e-CF.</p>
        </div>
        <button
          type="button"
          onClick={onRequestAssistance}
          className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
          Solicitar servicio de asistencia para certificacion
        </button>
      </div>
    );
  }

  if (validation.status === 'not_found') {
    return (
      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
          <span className="text-sm text-red-700">No se encontro este RNC en la base de datos de la DGII.</span>
        </div>
        <p className="text-xs text-red-600 mt-1 ml-6">
          Verifique que el numero sea correcto. Si es una cedula, debe incluir los 11 digitos sin guiones.
        </p>
      </div>
    );
  }

  if (validation.status === 'error') {
    return (
      <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
        <p className="text-xs text-gray-600">
          No se pudo validar el RNC: {validation.message}. Puede continuar manualmente.
        </p>
      </div>
    );
  }

  return null;
}

/**
 * Modal showing certification assistance service details and pricing.
 */
function CertificationAssistanceModal({ config, rncData, onClose }: {
  config: CertificationAssistanceConfig;
  rncData: DgiiRncResult | null;
  onClose: () => void;
}) {
  const [requested, setRequested] = useState(false);

  if (!config.isEnabled) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Servicio no disponible</h2>
          <p className="text-sm text-gray-600">
            El servicio de asistencia para certificacion no esta disponible actualmente.
            Por favor, contacte a soporte para mas informacion.
          </p>
          <button onClick={onClose} className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{config.title || 'Servicio de Asistencia para Certificacion'}</h2>
            {rncData && (
              <p className="text-sm text-gray-500 mt-1">
                Para: {rncData.razonSocial} ({rncData.rnc}) — Estado: {rncData.estado}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        {config.description && (
          <p className="text-sm text-gray-600">{config.description}</p>
        )}

        {/* Price */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">
            {config.currency} {config.price.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Tiempo estimado: {config.estimatedDays} dias habiles
          </p>
          {config.chargeOnNextBillingCycle && (
            <p className="text-xs text-blue-500 mt-1">
              Se cargara en su proximo ciclo de facturacion
            </p>
          )}
        </div>

        {/* What's included */}
        {config.includedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Que incluye:</h3>
            <ul className="space-y-1.5">
              {config.includedItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Requirements */}
        {config.requirements.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Documentos y credenciales requeridos:</h3>
            <ul className="space-y-1.5">
              {config.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {!requested ? (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
            >
              Ahora no
            </button>
            <button
              onClick={() => setRequested(true)}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Solicitar servicio
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center space-y-2">
            <svg className="w-10 h-10 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-sm font-medium text-green-800">Solicitud recibida</p>
            <p className="text-xs text-green-600">
              Nuestro equipo se pondra en contacto con usted en las proximas 24 horas para coordinar el proceso.
              {config.chargeOnNextBillingCycle && ' El cargo se aplicara en su proximo ciclo de facturacion.'}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition text-sm"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MappableField — Input field that shows a QBO suggestion when available.
 */
function MappableField({ label, value, onChange, placeholder, qboValue, qboLabel, onApplyQbo, dgiiValue, className = '' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  qboValue?: string;
  qboLabel?: string;
  onApplyQbo?: (v: string) => void;
  dgiiValue?: string;
  className?: string;
}) {
  const showQboSuggestion = qboValue && qboValue !== value;
  const sourceLabel = qboLabel || 'QBO';

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
      />

      {/* DGII auto-filled indicator */}
      {dgiiValue && dgiiValue === value && (
        <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Dato verificado por DGII
        </p>
      )}

      {/* DGII suggestion (when different from current value) */}
      {dgiiValue && dgiiValue !== value && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-green-600 truncate" title={dgiiValue}>
              <span className="font-medium">DGII:</span> {dgiiValue}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(dgiiValue)}
            className="px-2 py-0.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded transition shrink-0"
          >
            Usar dato DGII
          </button>
        </div>
      )}

      {showQboSuggestion && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 truncate" title={qboValue}>
              <span className="font-medium">{sourceLabel}:</span> {qboValue}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onApplyQbo?.(qboValue)}
            className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded transition shrink-0"
          >
            Usar dato QBO
          </button>
        </div>
      )}
      {qboValue && qboValue === value && !dgiiValue && (
        <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Dato desde QuickBooks
        </p>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
