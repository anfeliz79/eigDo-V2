'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api, type OnboardingStatus } from '@/lib/api';

const steps = [
  { key: 'QboConnection', label: 'QuickBooks Online', desc: 'Conecta tu cuenta para importar datos de empresa, clientes y proveedores', href: '/settings/qbo' },
  { key: 'CompanyData', label: 'Datos Fiscales', desc: 'RNC, razon social, datos del emisor (pre-cargados desde QBO)', href: '/settings/fiscal' },
  { key: 'CustomerMapping', label: 'Mapeo Clientes', desc: 'Asocia clientes QBO con datos fiscales DGII', href: '/settings/customers' },
  { key: 'VendorMapping', label: 'Mapeo Proveedores', desc: 'Asocia proveedores QBO con datos fiscales DGII', href: '/settings/vendors' },
  { key: 'TaxMapping', label: 'Mapeo Impuestos', desc: 'Configura indicadores de facturacion ITBIS', href: '/settings/taxes' },
  { key: 'ItemOverrides', label: 'Items', desc: 'Unidad de medida y tipo bien/servicio (opcional)', href: '/settings/items' },
  { key: 'CertificateUpload', label: 'Certificado Digital', desc: 'Sube tu certificado de firma digital', href: '/settings/certificate' },
  { key: 'SequenceSetup', label: 'Secuencias e-NCF', desc: 'Configura rangos de numeracion DGII', href: '/settings/sequences' },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qboJustConnected, setQboJustConnected] = useState(false);

  useEffect(() => {
    // Check if we just came back from QBO OAuth
    if (searchParams.get('qbo') === 'connected') {
      setQboJustConnected(true);
      window.history.replaceState({}, '', '/onboarding');
    }

    api.getOnboardingStatus()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status?.currentStep === 'Complete' || status?.completionPercentage === 100) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuracion Completa</h1>
        <p className="text-gray-500 mb-8">Tu empresa esta lista para emitir comprobantes electronicos.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          Ir al Dashboard
        </button>
      </div>
    );
  }

  // Build step completion state from backend response
  const missingItems = status?.missingItems || {};
  const currentStep = status?.currentStep || 'NotStarted';

  // The currentStep from backend tells us where the user is in the sequential flow
  const stepKeys = steps.map(s => s.key);
  const currentStepIndex = stepKeys.indexOf(currentStep);

  // A step is completed if it's before the currentStep index AND has no missing items
  const isStepComplete = (key: string): boolean => {
    const idx = stepKeys.indexOf(key);
    // Steps before currentStep are complete
    if (idx < currentStepIndex) return true;
    // Current step or later: check if it has missing items
    if (idx === currentStepIndex) return !(key in missingItems);
    return false;
  };

  // A step is accessible only if all previous steps are complete (strict gating)
  const isStepAccessible = (index: number): boolean => {
    if (index === 0) return true;
    // Can access this step if the previous step is complete
    return isStepComplete(steps[index - 1].key);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracion Inicial</h1>
        <p className="text-gray-500 mt-1">Completa estos pasos en orden para activar la emision de e-CF</p>
      </div>

      {/* QBO just connected notification */}
      {qboJustConnected && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <p className="text-sm text-green-800 font-medium">
            QuickBooks conectado exitosamente. Los datos de tu empresa se importaran automaticamente en el siguiente paso.
          </p>
        </div>
      )}

      {/* Progress */}
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Progreso</span>
          <span>{status?.completionPercentage || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 rounded-full h-2 transition-all duration-500"
            style={{ width: `${status?.completionPercentage || 0}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const completed = isStepComplete(step.key);
          const accessible = isStepAccessible(i);
          const isCurrent = accessible && !completed;
          const locked = !accessible && !completed;
          const stepMissing = missingItems[step.key as keyof typeof missingItems];

          return (
            <button
              key={step.key}
              onClick={() => {
                if (locked) return; // Can't click locked steps
                router.push(step.href);
              }}
              disabled={locked}
              className={`w-full flex items-center gap-4 p-5 rounded-xl border text-left transition-all ${
                completed
                  ? 'bg-green-50 border-green-200 cursor-pointer'
                  : isCurrent
                  ? 'bg-blue-50 border-blue-300 shadow-sm cursor-pointer'
                  : 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
              }`}
            >
              {/* Step number / check / lock */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                completed
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500'
              }`}>
                {completed ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : locked ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>

              <div className="flex-1">
                <h3 className={`font-semibold ${locked ? 'text-gray-400' : 'text-gray-900'}`}>{step.label}</h3>
                <p className={`text-sm ${locked ? 'text-gray-400' : 'text-gray-500'}`}>{step.desc}</p>
                {/* Show missing items hint for current step */}
                {isCurrent && stepMissing && Array.isArray(stepMissing) && stepMissing.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">{stepMissing[0]}</p>
                )}
              </div>

              {isCurrent && (
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full shrink-0">
                  Siguiente
                </span>
              )}

              {locked && (
                <span className="px-3 py-1 bg-gray-200 text-gray-500 text-xs font-medium rounded-full shrink-0">
                  Bloqueado
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
