'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function QboSettingsPage() {
  const [status, setStatus] = useState<{ connected: boolean; realmId?: string; lastSync?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    api.getQboStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await api.getQboAuthUrl();
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al conectar');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseas desconectar QuickBooks? Se detendran las emisiones automaticas.')) return;
    try {
      await api.disconnectQbo();
      setStatus({ connected: false });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al desconectar');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QuickBooks Online</h1>
        <p className="text-gray-500 mt-1">Gestiona la conexion con tu cuenta de QuickBooks</p>
      </div>

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
                <h3 className="font-semibold text-gray-900">Conectado</h3>
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

            <div className="flex items-center gap-3 pt-2">
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
                'Conectar QuickBooks'
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
    </div>
  );
}
