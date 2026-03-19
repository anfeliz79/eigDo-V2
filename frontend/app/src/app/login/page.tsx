'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        localStorage.setItem('eigdo_token', res.token);
        localStorage.setItem('eigdo_user', JSON.stringify(res.user));
      } else {
        const res = await api.register(email, password, fullName);
        localStorage.setItem('eigdo_token', res.token);
        localStorage.setItem('eigdo_user', JSON.stringify(res.user));
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12">
        <div>
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="text-white/90">eig</span>
            <span className="text-white">Do</span>
          </span>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Facturacion electronica<br />sin complicaciones
          </h2>
          <p className="text-blue-100 text-lg max-w-md">
            Conecta tu QuickBooks Online con la DGII y emite comprobantes fiscales electronicos de forma automatica.
          </p>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">10</div>
            <div className="text-blue-200 text-sm">Tipos e-CF</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">100%</div>
            <div className="text-blue-200 text-sm">Automatizado</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">DGII</div>
            <div className="text-blue-200 text-sm">Certificado</div>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden mb-8">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Iniciar Sesion' : 'Crear Cuenta'}
            </h1>
            <p className="mt-2 text-gray-500">
              {mode === 'login'
                ? 'Ingresa tus credenciales para continuar'
                : 'Completa tus datos para comenzar'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Juan Perez"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo Electronico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contrasena
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Minimo 8 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar Sesion' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {mode === 'login'
                ? 'No tienes cuenta? Crear una cuenta'
                : 'Ya tienes cuenta? Iniciar sesion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
