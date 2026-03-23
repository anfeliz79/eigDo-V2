'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Logo from '@/components/Logo';
import { api } from '@/lib/api';

// Plan data for immediate display (matches DB seed)
const PLAN_DETAILS: Record<string, { name: string; price: string; docs: number }> = {
  basico: { name: 'Basico', price: '$1,500/mes', docs: 100 },
  profesional: { name: 'Profesional', price: '$3,500/mes', docs: 500 },
  empresarial: { name: 'Empresarial', price: '$7,500/mes', docs: 2000 },
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planSlug = searchParams.get('plan') || '';
  const priceIdParam = searchParams.get('priceId') || '';

  // Redirect to landing if no plan selected
  const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || '';

  useEffect(() => {
    if (!planSlug || !priceIdParam) {
      const landingPlanes = LANDING_URL ? `${LANDING_URL}/#planes` : '/#planes';
      window.location.href = landingPlanes;
    }
  }, [planSlug, priceIdParam, LANDING_URL]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'redirecting'>('form');

  const [selectedPriceId] = useState(priceIdParam);
  const [selectedPlanSlug] = useState(planSlug);

  // If somehow no plan, show nothing while redirecting
  if (!planSlug || !priceIdParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const selectedPlan = PLAN_DETAILS[selectedPlanSlug] || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPriceId) {
      setError('Selecciona un plan para continuar.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Step 1: Register
      const authRes = await api.register({
        email,
        password,
        firstName,
        lastName,
        companyName,
      });

      // Save auth tokens and company ID
      localStorage.setItem('eigdo_token', authRes.accessToken);
      localStorage.setItem('eigdo_user', JSON.stringify(authRes.user));
      if (authRes.companies && authRes.companies.length > 0) {
        localStorage.setItem('eigdo_company', authRes.companies[0].companyId);
      }

      setStep('redirecting');

      // Step 2: Create Stripe checkout with the selected plan
      const checkout = await api.createCheckout(selectedPriceId);

      // Step 3: Redirect to Stripe
      window.location.href = checkout.url;
    } catch (err) {
      setStep('form');
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Preparando tu pago...</p>
          <p className="text-gray-500 mt-2">Seras redirigido a la pagina de pago seguro.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Plan Summary */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12">
        <div>
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="text-white/90">eig</span>
            <span className="text-white">Do</span>
          </span>
        </div>

        {selectedPlan ? (
          <div className="space-y-6">
            <div>
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">Plan seleccionado</p>
              <h2 className="text-3xl font-bold text-white mt-2">{selectedPlan.name}</h2>
              <p className="text-4xl font-bold text-white mt-3">{selectedPlan.price}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle />
                <span>Hasta {selectedPlan.docs.toLocaleString()} e-CF por mes</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle />
                <span>Todos los tipos e-CF (E31–E47)</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle />
                <span>Integracion QuickBooks Online</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle />
                <span>Soporte por email</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Facturacion electronica<br />sin complicaciones
            </h2>
            <p className="text-blue-100 text-lg max-w-md">
              Registra tu cuenta y selecciona un plan para comenzar a emitir e-CF desde QuickBooks Online.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 text-blue-200 text-sm">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <span>Pago seguro procesado por Stripe</span>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center lg:text-left">
            <div className="lg:hidden mb-6">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Crear tu Cuenta</h1>
            <p className="mt-2 text-gray-500">Completa tus datos para comenzar</p>
          </div>

          {/* Plan badge */}

          {/* Mobile plan badge */}
          {selectedPlan && (
            <div className="lg:hidden bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-800">Plan {selectedPlan.name}</p>
                <p className="text-xs text-blue-600">{selectedPlan.price} - {selectedPlan.docs} e-CF/mes</p>
              </div>
              <a href="/#planes" className="text-xs text-blue-600 underline">Cambiar</a>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
                  placeholder="Perez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Empresa</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
                placeholder="Mi Empresa SRL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electronico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
                placeholder="Minimo 8 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {loading ? 'Procesando...' : selectedPlan ? `Crear Cuenta y Pagar — ${selectedPlan.price}` : 'Crear Cuenta y Pagar'}
            </button>

            <p className="text-xs text-center text-gray-400 mt-2">
              Al crear tu cuenta aceptas los Terminos de Servicio y Politica de Privacidad.
            </p>
          </form>

          <div className="text-center">
            <span className="text-sm text-gray-500">Ya tienes cuenta? </span>
            <a href="/login" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Iniciar sesion
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle() {
  return (
    <svg className="w-5 h-5 text-blue-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
