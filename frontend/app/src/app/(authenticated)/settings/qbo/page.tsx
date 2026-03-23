'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type OnboardingStatus } from '@/lib/api';

interface QboStatus {
  connected: boolean;
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
    try {
      const data = await api.getQboAuthUrl() as any;
      window.location.href = data.authUrl;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al conectar');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseas desconectar QuickBooks? Se detendran las emisiones automaticas.')) return;
    try {
      await api.disconnectQbo();
      setStatus({ connected: false, sandbox: status?.sandbox });
      setMessage({ type: 'success', text: 'QuickBooks desconectado' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al desconectar' });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      await api.syncQbo();
      setMessage({ type: 'success', text: 'Datos sincronizados exitosamente desde QuickBooks' });
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
        <p className="text-gray-500 mt-1">Gestiona la conexion con tu cuenta de QuickBooks</p>
      </div>

      {/* Sandbox mode indicator */}
      {status?.sandbox && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-amber-800">
            <strong>Modo Sandbox:</strong> QBO_CLIENT_ID no esta configurado. La conexion se simulara para desarrollo.
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
                  <span className="font-medium">Ultima sincronizacion:</span>{' '}
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
                onClick={handleDisconnect}
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
                Conecta tu cuenta de QuickBooks Online para sincronizar facturas, gastos y emitir comprobantes automaticamente.
              </p>
            </div>

            {subscription && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  Tu plan <strong>{subscription.planName}</strong> incluye la conexion con QuickBooks.
                </p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Conectando...
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
        <p><strong>Como funciona:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Al conectar, eigdo recibe notificaciones cada vez que creas una factura o gasto en QBO</li>
          <li>Los documentos se transforman automaticamente aplicando tus 5 ciclos de mapeo</li>
          <li>Se emiten como e-CF a traves de Alanube y se reportan a la DGII</li>
          <li>Puedes ver el estado de cada documento en la seccion de Documentos</li>
        </ul>
      </div>

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
