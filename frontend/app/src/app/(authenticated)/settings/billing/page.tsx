'use client';

import { useEffect, useState } from 'react';
import { api, type PlanDto, type SubscriptionInfo, type PaymentHistory } from '@/lib/api';

export default function BillingPage() {
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getPlans().catch(() => []),
      api.getSubscription().catch(() => null),
      api.getPayments(10).catch(() => []),
    ]).then(([p, s, pay]) => {
      setPlans(p);
      setSubscription(s);
      setPayments(pay);
    }).finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    setError('');
    try {
      const result = await api.createCheckout(priceId);
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear sesion de pago');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await api.createBillingPortal();
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al abrir portal de facturacion');
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'DOP') return `RD$${amount.toLocaleString('es-DO')}`;
    if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`;
    return `$${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturacion</h1>
        <p className="text-gray-500 mt-1">Gestiona tu plan y pagos</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Current subscription */}
      {subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Suscripcion Actual</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              subscription.status === 'Active'
                ? 'bg-green-100 text-green-700'
                : subscription.status === 'Trial'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {subscription.status === 'Active' ? 'Activa' : subscription.status === 'Trial' ? 'Prueba' : subscription.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Plan</p>
              <p className="text-lg font-bold text-gray-900">{subscription.planName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Precio</p>
              <p className="text-lg font-bold text-gray-900">
                {formatAmount(subscription.priceAmount, 'DOP')}/{subscription.priceInterval === 'monthly' ? 'mes' : 'ano'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">e-CF Este Periodo</p>
              <p className="text-lg font-bold text-gray-900">
                {subscription.documentsEmittedThisPeriod}
                <span className="text-sm font-normal text-gray-400"> / {subscription.includedDocumentsPerMonth}</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Proximo Pago</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(subscription.currentPeriodEndUtc).toLocaleDateString('es-DO')}
              </p>
            </div>
          </div>

          {/* Usage bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Uso de documentos</span>
              <span>{Math.round((subscription.documentsEmittedThisPeriod / subscription.includedDocumentsPerMonth) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`rounded-full h-2 transition-all ${
                  subscription.documentsEmittedThisPeriod / subscription.includedDocumentsPerMonth > 0.9
                    ? 'bg-red-500'
                    : subscription.documentsEmittedThisPeriod / subscription.includedDocumentsPerMonth > 0.7
                    ? 'bg-yellow-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, (subscription.documentsEmittedThisPeriod / subscription.includedDocumentsPerMonth) * 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleManageSubscription}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              Gestionar Suscripcion
            </button>
          </div>
        </div>
      )}

      {/* Plans */}
      {!subscription && plans.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Selecciona un Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, idx) => {
              const monthlyPrice = plan.prices.find(p => p.interval === 'monthly');
              const isPopular = idx === 1;
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl border-2 p-6 relative ${
                    isPopular ? 'border-blue-600 shadow-lg' : 'border-gray-200'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Popular</span>
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
                      Todos los tipos e-CF (E31-E47)
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckIcon />
                      Integracion QuickBooks Online
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckIcon />
                      Soporte por email
                    </li>
                  </ul>

                  {monthlyPrice && (
                    <button
                      onClick={() => handleCheckout(monthlyPrice.id)}
                      disabled={checkoutLoading === monthlyPrice.id}
                      className={`w-full mt-6 py-3 font-semibold rounded-lg transition ${
                        isPopular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      } disabled:opacity-50`}
                    >
                      {checkoutLoading === monthlyPrice.id ? 'Procesando...' : 'Comenzar Ahora'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Historial de Pagos</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metodo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(payment.createdAtUtc).toLocaleDateString('es-DO')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatAmount(payment.amount, payment.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      payment.status === 'succeeded'
                        ? 'bg-green-100 text-green-700'
                        : payment.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status === 'succeeded' ? 'Pagado' : payment.status === 'failed' ? 'Fallido' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{payment.gateway}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No subscription, no plans */}
      {!subscription && plans.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No hay planes disponibles en este momento.</p>
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}
