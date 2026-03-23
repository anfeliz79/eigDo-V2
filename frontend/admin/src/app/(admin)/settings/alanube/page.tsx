'use client';

import { useEffect, useState } from 'react';
import { adminApi, type PlatformAlanubeConfig } from '@/lib/api';

export default function AlanubeConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [baseUrl, setBaseUrl] = useState('');
  const [environment, setEnvironment] = useState('Sandbox');
  const [jwtToken, setJwtToken] = useState('');

  const [maskedToken, setMaskedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    adminApi.getPlatformAlanubeConfig()
      .then((config: PlatformAlanubeConfig) => {
        setBaseUrl(config.baseUrl || '');
        setEnvironment(config.environment || 'Sandbox');
        setMaskedToken(config.jwtToken || null);
      })
      .catch(() => setMessage({ type: 'error', text: 'Error al cargar la configuracion.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.updatePlatformAlanubeConfig({
        baseUrl,
        environment,
        jwtToken: jwtToken || undefined,
      });
      setMessage({ type: 'success', text: 'Configuracion de Alanube actualizada exitosamente.' });
      if (jwtToken) {
        setMaskedToken(jwtToken.slice(0, 4) + '****' + jwtToken.slice(-4));
        setJwtToken('');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar la configuracion.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
  );

  const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuracion Alanube</h1>
          <p className="text-gray-500 mt-2">Configura la conexion con el proveedor fiscal Alanube</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuracion Alanube</h1>
        <p className="text-gray-500 mt-2">Configura la conexion con el proveedor fiscal Alanube</p>
      </div>

      {/* Success / Error Messages */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-100'
            : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckIcon /> : <XIcon />}
          {message.text}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Card (left, wider) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="space-y-8">
            {/* Section: Conexion API */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Conexion API</h2>
              <div className="space-y-5">
                {/* URL Base */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    URL Base
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.alanube.co"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">URL del API de Alanube (sandbox o produccion)</p>
                </div>

                {/* Ambiente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ambiente
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-colors"
                  >
                    <option value="Sandbox">Sandbox</option>
                    <option value="Production">Produccion</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">Sandbox para pruebas, Produccion para datos reales</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Section: Autenticacion */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Autenticacion</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Token JWT
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={jwtToken}
                    onChange={(e) => setJwtToken(e.target.value)}
                    placeholder={maskedToken || 'Ingrese el Token JWT'}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showToken ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {maskedToken && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-xs text-gray-400">
                      Valor actual: <span className="font-mono text-gray-500">{maskedToken}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(maskedToken)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copiar valor"
                    >
                      <CopyIcon />
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">Dejar vacio para mantener el valor actual.</p>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </span>
                ) : 'Guardar Configuracion'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Card (right, narrower) */}
        <div className="lg:col-span-1">
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6 sticky top-6">
            <div className="flex items-start gap-3 mb-4">
              <InfoIcon />
              <h3 className="text-sm font-semibold text-blue-900">Informacion</h3>
            </div>
            <ul className="space-y-3 text-sm text-blue-700">
              <li className="flex items-start gap-2">
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0" />
                eigdo actua como reseller de Alanube.
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0" />
                Un solo token JWT para toda la plataforma.
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0" />
                Cada empresa se registra como Associated Company.
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0" />
                Los secretos se almacenan encriptados en la base de datos.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
