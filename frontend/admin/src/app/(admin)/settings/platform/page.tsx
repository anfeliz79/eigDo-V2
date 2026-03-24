'use client';

import { useEffect, useState } from 'react';
import { adminApi, type PlatformConfig, type SslCertificate } from '@/lib/api';

export default function PlatformConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // URL fields
  const [appUrl, setAppUrl] = useState('');
  const [adminUrl, setAdminUrl] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [landingUrl, setLandingUrl] = useState('');

  // Support fields
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [viafirmaUrl, setViafirmaUrl] = useState('');

  // SSL
  const [sslCerts, setSslCerts] = useState<SslCertificate[]>([]);
  const [sslError, setSslError] = useState<string | null>(null);
  const [sslLoading, setSslLoading] = useState(false);

  useEffect(() => {
    adminApi.getPlatformConfig()
      .then((config: PlatformConfig) => {
        setAppUrl(config['platform.app_url'] || '');
        setAdminUrl(config['platform.admin_url'] || '');
        setApiUrl(config['platform.api_url'] || '');
        setLandingUrl(config['platform.landing_url'] || '');
        setWhatsappNumber(config['platform.whatsapp_number'] || '');
        setSupportEmail(config['platform.support_email'] || '');
        setViafirmaUrl(config['platform.viafirma_url'] || '');
      })
      .catch(() => setMessage({ type: 'error', text: 'Error al cargar la configuracion.' }))
      .finally(() => setLoading(false));

    loadSslStatus();
  }, []);

  const loadSslStatus = async () => {
    setSslLoading(true);
    setSslError(null);
    try {
      const res = await adminApi.getSslStatus();
      setSslCerts(res.certificates || []);
      if (res.error) setSslError(res.error);
    } catch {
      setSslError('No se pudo obtener el estado de los certificados.');
    } finally {
      setSslLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.updatePlatformConfig({
        'platform.app_url': appUrl,
        'platform.admin_url': adminUrl,
        'platform.api_url': apiUrl,
        'platform.landing_url': landingUrl,
        'platform.whatsapp_number': whatsappNumber,
        'platform.support_email': supportEmail,
        'platform.viafirma_url': viafirmaUrl,
      });
      setMessage({ type: 'success', text: 'Configuracion de plataforma actualizada exitosamente.' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar la configuracion.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const getSslStatusColor = (days: number) => {
    if (days > 30) return 'bg-green-100 text-green-700';
    if (days >= 15) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getSslDotColor = (days: number) => {
    if (days > 30) return 'bg-green-500';
    if (days >= 15) return 'bg-yellow-500';
    return 'bg-red-500';
  };

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

  const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuracion de Plataforma</h1>
          <p className="text-gray-500 mt-2">URLs, datos de soporte y certificados SSL</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Configuracion de Plataforma</h1>
        <p className="text-gray-500 mt-2">URLs, datos de soporte y certificados SSL</p>
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
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: URLs de la Plataforma */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="space-y-8">
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">URLs de la Plataforma</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">App URL</label>
                    <input
                      type="text"
                      value={appUrl}
                      onChange={(e) => setAppUrl(e.target.value)}
                      placeholder="https://staging.eigdo.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">URL principal de la aplicacion web</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin URL</label>
                    <input
                      type="text"
                      value={adminUrl}
                      onChange={(e) => setAdminUrl(e.target.value)}
                      placeholder="https://staging-admin.eigdo.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">URL del panel de administracion</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">API URL</label>
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://staging-api.eigdo.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">URL base de la API</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Landing URL</label>
                    <input
                      type="text"
                      value={landingUrl}
                      onChange={(e) => setLandingUrl(e.target.value)}
                      placeholder="https://eigdo.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">URL de la pagina de inicio / landing page</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Section 2: Soporte */}
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Soporte</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Numero de WhatsApp</label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+1 (809) 555-0000"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">Numero de contacto para soporte via WhatsApp</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de Soporte</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="soporte@eigdo.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">Email principal de soporte al cliente</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">URL de Viafirma</label>
                    <input
                      type="text"
                      value={viafirmaUrl}
                      onChange={(e) => setViafirmaUrl(e.target.value)}
                      placeholder="https://viafirma.com/comprar-certificado"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">URL para compra de certificados digitales en Viafirma</p>
                  </div>
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

          {/* Section 3: SSL Certificates */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Certificados SSL</h2>
              <button
                onClick={loadSslStatus}
                disabled={sslLoading}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              >
                {sslLoading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Verificar SSL
              </button>
            </div>

            {sslError && (
              <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-100 text-sm text-yellow-700">
                {sslError}
              </div>
            )}

            {sslCerts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Dominios</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Expiracion</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Dias Restantes</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sslCerts.map((cert, idx) => (
                      <tr key={idx} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 px-4 font-mono text-gray-700">{cert.domains}</td>
                        <td className="py-3 px-4 text-gray-600">{cert.expiryDate}</td>
                        <td className="py-3 px-4 text-gray-600">{cert.daysRemaining} dias</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getSslStatusColor(cert.daysRemaining)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getSslDotColor(cert.daysRemaining)}`} />
                            {cert.daysRemaining > 30 ? 'Valido' : cert.daysRemaining >= 15 ? 'Por vencer' : 'Critico'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !sslLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">No se encontraron certificados SSL.</p>
            ) : null}

            <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <InfoIcon />
              <p className="text-sm text-gray-500">
                Los certificados se renuevan automaticamente con Let&apos;s Encrypt. Si un certificado esta proximo a vencer, verifique que el cron de renovacion este activo en el servidor.
              </p>
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
                Estas URLs se usan para redirects de Stripe, callbacks de QBO, y links en emails.
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0" />
                Los frontends usan URLs bakeadas en el build.
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0" />
                Los cambios se aplican inmediatamente sin reiniciar el servidor.
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0" />
                El estado SSL se consulta en tiempo real al servidor.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
