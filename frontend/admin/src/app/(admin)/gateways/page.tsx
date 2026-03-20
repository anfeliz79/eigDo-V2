'use client';

import { useEffect, useState } from 'react';
import { adminApi, type PaymentGateway } from '@/lib/api';

const statusColors: Record<string, string> = {
  activo: 'bg-green-100 text-green-700',
  no_configurado: 'bg-yellow-100 text-yellow-700',
  pendiente: 'bg-slate-100 text-slate-600',
};

const statusLabels: Record<string, string> = {
  activo: 'Activo',
  no_configurado: 'No Configurado',
  pendiente: 'Pendiente',
};

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPaymentGateways()
      .then((res) => setGateways(res.gateways))
      .catch(() => setGateways([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pasarelas de Pago</h1>
        <p className="text-slate-500 mt-1">Estado de las integraciones de pago</p>
      </div>

      {loading ? (
        <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gateways.map((gw) => (
            <div key={gw.name} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{gw.name}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[gw.status] || 'bg-slate-100 text-slate-600'}`}>
                  {statusLabels[gw.status] || gw.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">{gw.description}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">API Configurada</span>
                  <span className={gw.configured ? 'text-green-600 font-medium' : 'text-slate-400'}>
                    {gw.configured ? 'Si' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Webhook Configurado</span>
                  <span className={gw.webhookConfigured ? 'text-green-600 font-medium' : 'text-slate-400'}>
                    {gw.webhookConfigured ? 'Si' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Pagos Procesados</span>
                  <span className="text-slate-900 font-mono">{gw.totalPayments}</span>
                </div>
              </div>
              {gw.name === 'Azul' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">Integracion con Azul esta en desarrollo. Pronto podras aceptar pagos locales con tarjetas dominicanas.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
