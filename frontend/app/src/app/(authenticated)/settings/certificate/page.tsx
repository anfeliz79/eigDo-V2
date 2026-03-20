'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, type CertificateInfo, type OnboardingStatus } from '@/lib/api';

export default function CertificateUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [certInfo, setCertInfo] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    loadCertificateStatus();
    api.getOnboardingStatus()
      .then((s: OnboardingStatus) => {
        setIsOnboarding(s.currentStep !== 'Complete' && s.completionPercentage < 100);
      })
      .catch(() => {});
  }, []);

  const loadCertificateStatus = () => {
    setLoading(true);
    api.getCertificateStatus()
      .then((info) => {
        setCertInfo(info);
        setShowUploadForm(!info.configured);
      })
      .catch(() => setCertInfo(null))
      .finally(() => setLoading(false));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'p12' && ext !== 'pfx') {
      setMessage({ type: 'error', text: 'Solo se permiten archivos .p12 o .pfx' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'El archivo no puede exceder 10 MB.' });
      return;
    }
    setSelectedFile(file);
    setMessage(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !password) return;
    setUploading(true);
    setMessage(null);
    try {
      const info = await api.uploadCertificate(selectedFile, password);
      setCertInfo(info);
      setShowUploadForm(false);
      setSelectedFile(null);
      setPassword('');
      setMessage({ type: 'success', text: 'Certificado cargado exitosamente.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cargar el certificado.' });
    } finally {
      setUploading(false);
    }
  };

  const handleReplace = () => {
    setShowUploadForm(true);
    setSelectedFile(null);
    setPassword('');
    setMessage(null);
  };

  const handleContinue = async () => {
    try {
      await api.advanceOnboarding('SequenceSetup');
    } catch {}
    router.push('/settings/sequences');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getExpiryStatus = (daysUntilExpiry?: number) => {
    if (daysUntilExpiry == null) return 'unknown';
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 30) return 'warning';
    return 'ok';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Certificado Digital</h1>
        <p className="text-gray-500 mt-1">Sube tu certificado digital (.p12/.pfx) para firmar comprobantes fiscales electronicos.</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : (
        <>
          {/* Certificate status */}
          {certInfo?.configured && !showUploadForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  </div>
                  <div>
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      Certificado Configurado
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleReplace}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Reemplazar Certificado
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Sujeto</label>
                  <p className="text-sm text-gray-900 font-mono break-all">{certInfo.subject || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Emisor</label>
                  <p className="text-sm text-gray-900 font-mono break-all">{certInfo.issuer || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Fecha de Expiracion</label>
                  <p className="text-sm text-gray-900">{formatDate(certInfo.expiresUtc)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Dias Restantes</label>
                  {(() => {
                    const status = getExpiryStatus(certInfo.daysUntilExpiry);
                    return (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        status === 'expired'
                          ? 'bg-red-100 text-red-700'
                          : status === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}>
                        {status === 'expired'
                          ? `Expirado hace ${Math.abs(certInfo.daysUntilExpiry!)} dias`
                          : `${certInfo.daysUntilExpiry} dias`}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Expiry warnings */}
              {getExpiryStatus(certInfo.daysUntilExpiry) === 'expired' && (
                <div className="px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                  <strong>Certificado expirado.</strong> Debes subir un nuevo certificado para continuar firmando comprobantes.
                </div>
              )}
              {getExpiryStatus(certInfo.daysUntilExpiry) === 'warning' && (
                <div className="px-4 py-3 rounded-lg text-sm bg-amber-50 text-amber-700 border border-amber-200">
                  <strong>Certificado proximo a expirar.</strong> Te quedan {certInfo.daysUntilExpiry} dias. Renueva tu certificado pronto.
                </div>
              )}
            </div>
          )}

          {/* Upload form */}
          {showUploadForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {certInfo?.configured ? 'Reemplazar Certificado' : 'Subir Certificado'}
              </h2>

              {/* Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : selectedFile
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".p12,.pfx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <svg className="w-10 h-10 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">Arrastra tu certificado aqui o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-500">Archivos .p12 o .pfx (maximo 10 MB)</p>
                  </div>
                )}
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="cert-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Contrasena del Certificado
                </label>
                <div className="relative">
                  <input
                    id="cert-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa la contrasena del certificado"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || !password || uploading}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                      Subir Certificado
                    </>
                  )}
                </button>
                {certInfo?.configured && (
                  <button
                    onClick={() => {
                      setShowUploadForm(false);
                      setSelectedFile(null);
                      setPassword('');
                      setMessage(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Onboarding navigation */}
      {isOnboarding && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => router.push('/settings/items')}
            className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-900 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver a Items
          </button>
          <button
            onClick={handleContinue}
            disabled={!certInfo?.configured}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition flex items-center gap-2"
          >
            Continuar a Secuencias
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
