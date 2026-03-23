'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { adminApi, type PaymentGateway } from '@/lib/api';

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  activo: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', label: 'Activo' },
  no_configurado: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'No Configurado' },
  pendiente: { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600', label: 'Pendiente' },
};

const gatewayIcons: Record<string, ReactNode> = {
  Stripe: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none">
      <rect width="24" height="24" rx="4" fill="#635BFF" />
      <path d="M13.976 9.15c-2.059-.09-3.927.803-3.927 2.723 0 2.884 3.97 2.423 3.97 3.667 0 .487-.425.646-.994.646-.877 0-1.982-.367-2.864-.866l-.505 2.36c.687.36 1.95.6 2.86.6 2.225 0 3.817-.88 3.817-2.795 0-3.049-3.982-2.555-3.982-3.71 0-.406.362-.556.88-.556.72 0 1.62.23 2.338.604l.486-2.3c-.637-.28-1.486-.463-2.079-.463v-.01z" fill="white" />
    </svg>
  ),
  Azul: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none">
      <rect width="24" height="24" rx="4" fill="#0066CC" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
    </svg>
  ),
};

const defaultGatewayIcon = (
  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none">
    <rect width="24" height="24" rx="4" fill="#E5E7EB" />
    <path d="M12 6v12M6 12h12" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPaymentGateways()
      .then((res) => setGateways(res.gateways))
      .catch(() => setGateways([]))
      .finally(() => setLoading(false));
  }, []);

  const CheckCircle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const XCircle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pasarelas de Pago</h1>
        <p className="text-gray-500 mt-2">Estado de las integraciones de pago configuradas en la plataforma</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : gateways.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-gray-500 text-sm">No hay pasarelas de pago configuradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gateways.map((gw) => {
            const status = statusConfig[gw.status] || statusConfig.pendiente;
            return (
              <div key={gw.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                {/* Status Badge (top-right) */}
                <div className="absolute top-5 right-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                {/* Icon + Name */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="shrink-0">
                    {gatewayIcons[gw.name] || defaultGatewayIcon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{gw.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{gw.description}</p>
                  </div>
                </div>

                {/* Configuration Status */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Configurada</span>
                    <div className="flex items-center gap-1.5">
                      {gw.configured ? <CheckCircle /> : <XCircle />}
                      <span className={`text-sm font-medium ${gw.configured ? 'text-green-600' : 'text-gray-400'}`}>
                        {gw.configured ? 'Si' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Webhook Configurado</span>
                    <div className="flex items-center gap-1.5">
                      {gw.webhookConfigured ? <CheckCircle /> : <XCircle />}
                      <span className={`text-sm font-medium ${gw.webhookConfigured ? 'text-green-600' : 'text-gray-400'}`}>
                        {gw.webhookConfigured ? 'Si' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Pagos Procesados</span>
                    <span className="text-sm font-semibold text-gray-900 font-mono">{gw.totalPayments.toLocaleString()}</span>
                  </div>
                </div>

                {/* Azul development notice */}
                {gw.name === 'Azul' && (
                  <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-xs text-amber-700">Integracion con Azul esta en desarrollo. Pronto podras aceptar pagos locales con tarjetas dominicanas.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
