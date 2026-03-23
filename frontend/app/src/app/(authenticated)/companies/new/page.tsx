'use client';

import { useState } from 'react';
import { api, type PlanDto } from '@/lib/api';
import Logo from '@/components/Logo';

type Step = 'name' | 'plan';

export default function NewCompanyPage() {
  const [step, setStep] = useState<Step>('name');
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setLoading(true);
    setError('');
    try {
      const company = await api.createCompany(companyName.trim());
      setCompanyId(company.id);

      // Cargar planes disponibles
      const availablePlans = await api.getPlans();
      setPlans(availablePlans);
      setStep('plan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (priceId: string) => {
    setCheckoutLoading(priceId);
    setError('');
    try {
      // Temporalmente setear la nueva empresa para que el checkout use el company header correcto
      const previousCompany = localStorage.getItem('eigdo_company');
      localStorage.setItem('eigdo_company', companyId);

      try {
        const result = await api.createCheckout(
          priceId,
          `${window.location.origin}/billing/success?company=${companyId}`,
          `${window.location.origin}/companies/new`
        );
        window.location.href = result.url;
      } catch (err) {
        // Restaurar empresa anterior si falla
        if (previousCompany) {
          localStorage.setItem('eigdo_company', previousCompany);
        } else {
          localStorage.removeItem('eigdo_company');
        }
        throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear sesion de pago');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'DOP') return `RD$${amount.toLocaleString('es-DO')}`;
    if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`;
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Agregar Empresa</h1>
        <p className="text-gray-500 mt-1">
          {step === 'name'
            ? 'Ingresa el nombre de tu nueva empresa'
            : 'Selecciona un plan para tu empresa'}
        </p>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-3 mb-8">
        <StepIndicator number={1} label="Nombre" active={step === 'name'} completed={step === 'plan'} />
        <div className="flex-1 h-px bg-gray-200" />
        <StepIndicator number={2} label="Plan" active={step === 'plan'} completed={false} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {step === 'name' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <form onSubmit={handleCreateCompany} className="space-y-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Empresa
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Mi Empresa SRL"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                autoFocus
                required
              />
              <p className="mt-2 text-xs text-gray-400">
                Puedes cambiar esto despues en la configuracion fiscal.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !companyName.trim()}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creando...
                  </span>
                ) : (
                  'Continuar'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'plan' && (
        <div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
            <p className="text-sm text-blue-800">
              Empresa <span className="font-semibold">{companyName}</span> creada. Ahora selecciona un plan.
            </p>
          </div>

          {plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan, idx) => {
                const monthlyPrice = plan.prices.find((p) => p.interval === 'monthly');
                const isPopular = idx === 1;
                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-2xl border-2 p-6 relative ${
                      isPopular ? 'border-blue-600 shadow-lg' : 'border-gray-200'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Popular
                        </span>
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{plan.description}</p>

                    {monthlyPrice && (
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatAmount(monthlyPrice.amount, monthlyPrice.currency)}
                        </span>
                        <span className="text-gray-500 text-sm">/mes</span>
                      </div>
                    )}

                    <ul className="mt-4 space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckIcon />
                        {plan.includedDocumentsPerMonth} e-CF por mes
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckIcon />
                        Todos los tipos e-CF
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckIcon />
                        Integracion QuickBooks Online
                      </li>
                    </ul>

                    {monthlyPrice && (
                      <button
                        onClick={() => handleSelectPlan(monthlyPrice.id)}
                        disabled={checkoutLoading === monthlyPrice.id}
                        className={`w-full mt-6 py-3 font-semibold rounded-xl transition ${
                          isPopular
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                        } disabled:opacity-50`}
                      >
                        {checkoutLoading === monthlyPrice.id ? 'Procesando...' : 'Seleccionar Plan'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No hay planes disponibles en este momento.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          completed
            ? 'bg-blue-600 text-white'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {completed ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span
        className={`text-sm font-medium ${
          active || completed ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-blue-600 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}
