'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type OnboardingStatus } from '@/lib/api';

const steps = [
  { key: 'CompanyData', label: 'Datos Fiscales', desc: 'RNC, razon social, datos del emisor', href: '/settings/fiscal' },
  { key: 'CustomerMapping', label: 'Mapeo Clientes', desc: 'Asocia clientes QBO con datos fiscales', href: '/settings/customers' },
  { key: 'VendorMapping', label: 'Mapeo Proveedores', desc: 'Asocia proveedores QBO con datos fiscales', href: '/settings/vendors' },
  { key: 'TaxMapping', label: 'Mapeo Impuestos', desc: 'Configura indicadores de facturacion ITBIS', href: '/settings/taxes' },
  { key: 'ItemOverrides', label: 'Items', desc: 'Unidad de medida y tipo bien/servicio', href: '/settings/items' },
  { key: 'CertificateUpload', label: 'Certificado Digital', desc: 'Sube tu certificado de firma digital', href: '/settings/fiscal' },
  { key: 'SequenceSetup', label: 'Secuencias e-NCF', desc: 'Configura rangos de numeracion DGII', href: '/settings/fiscal' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOnboardingStatus()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status?.isComplete) {
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

  const completedSet = new Set(status?.completedSteps || []);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracion Inicial</h1>
        <p className="text-gray-500 mt-1">Completa estos pasos para activar la emision de e-CF</p>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Progreso</span>
          <span>{completedSet.size} de {steps.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 rounded-full h-2 transition-all duration-500"
            style={{ width: `${(completedSet.size / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const completed = completedSet.has(step.key);
          const isCurrent = !completed && (i === 0 || completedSet.has(steps[i - 1].key));

          return (
            <button
              key={step.key}
              onClick={() => router.push(step.href)}
              className={`w-full flex items-center gap-4 p-5 rounded-xl border text-left transition-all ${
                completed
                  ? 'bg-green-50 border-green-200'
                  : isCurrent
                  ? 'bg-blue-50 border-blue-300 shadow-sm'
                  : 'bg-white border-gray-200 opacity-60'
              }`}
            >
              {/* Step number / check */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                completed
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {completed ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{step.label}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>

              {isCurrent && (
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                  Siguiente
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
