'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type OnboardingStatus } from '@/lib/api';

interface QboStatus {
  connected: boolean;
  configured?: boolean;
  realmId?: string;
  lastSync?: string;
  sandbox?: boolean;
}

export default function QboSettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<QboStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [subscription, setSubscription] = useState<{ planName?: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getQboStatus()
        .then((data: any) => setStatus(data))
        .catch(() => setStatus({ connected: false })),
      api.getSubscription()
        .then((sub: any) => {
          if (sub) setSubscription({ planName: sub.planName });
        })
        .catch(() => {}),
      api.getOnboardingStatus()
        .then((s: OnboardingStatus) => {
          setIsOnboarding(s.currentStep !== 'Complete' && s.completionPercentage < 100);
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const data = await api.getQboAuthUrl() as any;
      window.location.href = data.authUrl;
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al conectar con QuickBooks' });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectQbo();
      setStatus({ connected: false, sandbox: status?.sandbox });
      setMessage({ type: 'success', text: 'QuickBooks desconectado exitosamente' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al desconectar' });
    } finally {
      setShowDisconnectConfirm(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await api.syncQbo();
      setMessage({
        type: result.partial ? 'error' : 'success',
        text: result.message,
      });
      // Refresh status to get new lastSync timestamp
      const newStatus = await api.getQboStatus() as any;
      setStatus(newStatus);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al sincronizar' });
    } finally {
      setSyncing(false);
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      await api.advanceOnboarding('CompanyData');
    } catch {}
    router.push('/settings/fiscal');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QuickBooks Online</h1>
        <p className="text-gray-500 mt-1">Gestiona la conexión con tu cuenta de QuickBooks</p>
      </div>

      {/* QBO not configured warning */}
      {status && !status.configured && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-800">QuickBooks no configurado</p>
            <p className="text-sm text-red-700 mt-1">
              El administrador debe configurar las credenciales de QuickBooks desde el panel de administración antes de poder conectar.
            </p>
          </div>
        </div>
      )}

      {/* Sandbox mode indicator */}
      {status?.configured && status?.sandbox && !status?.connected && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <p className="text-sm text-blue-800">
            <strong>Modo Sandbox:</strong> Conectarás con el entorno de pruebas de QuickBooks.
          </p>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {status?.connected ? (
          <div className="space-y-6">
            {/* Connected state */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">Conectado</h3>
                  {status.sandbox && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      Sandbox
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">Realm ID: {status.realmId}</p>
              </div>
            </div>

            {status.lastSync && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Última sincronización:</span>{' '}
                  {new Date(status.lastSync).toLocaleString('es-DO')}
                </p>
              </div>
            )}

            {subscription && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Plan:</span> {subscription.planName}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition text-sm font-medium flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                    </svg>
                    Sincronizar Ahora
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium"
              >
                Desconectar
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-6">
            {/* Disconnected state */}
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">QuickBooks no conectado</h3>
              <p className="text-gray-500 mt-1 max-w-md mx-auto">
                Conecta tu cuenta de QuickBooks Online para sincronizar facturas, gastos y emitir comprobantes automáticamente.
              </p>
            </div>

            {subscription && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  Tu plan <strong>{subscription.planName}</strong> incluye la conexión con QuickBooks.
                </p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting || !status?.configured}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Conectando...
                </>
              ) : !status?.configured ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  Configuración Pendiente
                </>
              ) : (
                <>
                  Conectar QuickBooks
                  {status?.sandbox && <span className="text-green-200 text-xs">(Sandbox)</span>}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 space-y-2">
        <p><strong>Cómo funciona:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Al conectar, eigdo recibe notificaciones cada vez que creas una factura o gasto en QBO</li>
          <li>Los documentos se transforman automáticamente aplicando tus 5 ciclos de mapeo</li>
          <li>Se emiten como e-CF a través de Alanube y se reportan a la DGII</li>
          <li>Puedes ver el estado de cada documento en la sección de Documentos</li>
        </ul>
      </div>

      {/* Disconnect confirmation modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">¿Desconectar QuickBooks?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Se detendrán las emisiones automáticas de e-CF. Podrás volver a conectar en cualquier momento.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                Sí, desconectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding navigation */}
      {isOnboarding && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => router.push('/onboarding')}
            className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-900 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver al Onboarding
          </button>
          {status?.connected && (
            <button
              onClick={handleContinueOnboarding}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              Continuar a Datos Fiscales
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
