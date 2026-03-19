'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminSubscription } from '@/lib/api';

const plans = [
  { name: 'Basico', price: 'RD$ 2,500', docs: '50 e-CF/mes', features: ['1 empresa', 'Soporte email'] },
  { name: 'Profesional', price: 'RD$ 5,900', docs: '200 e-CF/mes', features: ['3 empresas', 'Soporte prioritario', 'API access'] },
  { name: 'Enterprise', price: 'RD$ 12,900', docs: 'Ilimitados', features: ['Empresas ilimitadas', 'Soporte dedicado', 'API access', 'SLA 99.9%'] },
];

const statusColor: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Canceled: 'bg-red-100 text-red-700',
  PastDue: 'bg-yellow-100 text-yellow-700',
  Trial: 'bg-blue-100 text-blue-700',
};

export default function PlansPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getSubscriptions()
      .then((res) => setSubscriptions(res.items))
      .catch(() => setSubscriptions([]))
      .finally(() => setLoading(false));
  }, []);

  // Count subscribers per plan
  const subscriberCount = (planName: string) =>
    subscriptions.filter((s) => s.planName === planName && s.status === 'Active').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Planes y Precios</h1>
        <p className="text-slate-500 mt-1">Configuracion de planes de suscripcion</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.name} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">{plan.price}<span className="text-sm text-slate-400 font-normal">/mes</span></p>
            </div>
            <p className="text-sm text-slate-600 font-medium">{plan.docs}</p>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <span className="text-xs text-slate-400">Suscriptores activos: {subscriberCount(plan.name)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Subscriptions table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Suscripciones</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Sin suscripciones</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">e-CF usados</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Pasarela</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Periodo actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.companyName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.planName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[s.status] || 'bg-gray-100 text-gray-600'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right font-mono">
                      {s.documentsEmittedThisPeriod}/{s.includedDocumentsPerMonth === 0 ? '∞' : s.includedDocumentsPerMonth}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.gateway}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(s.currentPeriodStartUtc).toLocaleDateString('es-DO')} — {new Date(s.currentPeriodEndUtc).toLocaleDateString('es-DO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
