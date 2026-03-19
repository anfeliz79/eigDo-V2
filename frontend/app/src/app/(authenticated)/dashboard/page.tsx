'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, type OnboardingStatus } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOnboardingStatus()
      .then(setOnboarding)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user?.fullName?.split(' ')[0] || 'Usuario'}
        </h1>
        <p className="text-gray-500 mt-1">Panel de control de facturacion electronica</p>
      </div>

      {/* Onboarding banner */}
      {!loading && onboarding && !onboarding.isComplete && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Completa tu configuracion</h3>
              <p className="text-blue-100 mt-1">
                Configura datos fiscales, mapea clientes e impuestos para emitir e-CF.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition whitespace-nowrap"
            >
              Continuar Setup
            </Link>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-blue-100 mb-1">
              <span>Progreso</span>
              <span>{onboarding.completedSteps.length} de 7 pasos</span>
            </div>
            <div className="w-full bg-blue-800 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${(onboarding.completedSteps.length / 7) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Documentos Hoy', value: '--', sub: 'e-CF emitidos', color: 'blue' },
          { title: 'Aceptados', value: '--', sub: 'por la DGII', color: 'green' },
          { title: 'Pendientes', value: '--', sub: 'en proceso', color: 'yellow' },
          { title: 'Rechazados', value: '--', sub: 'requieren atencion', color: 'red' },
        ].map((s) => (
          <div key={s.title} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">{s.title}</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="mt-1 text-sm text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { href: '/documents', title: 'Ver Documentos', desc: 'Lista de comprobantes emitidos' },
          { href: '/settings/fiscal', title: 'Datos Fiscales', desc: 'RNC, razon social, configuracion' },
          { href: '/settings/qbo', title: 'QuickBooks', desc: 'Conectar integracion QBO' },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all">
            <h3 className="font-semibold text-gray-900">{a.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent docs placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Documentos Recientes</h3>
          <Link href="/documents" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver todos</Link>
        </div>
        <div className="p-12 text-center text-gray-400">
          <p>No hay documentos aun. Completa la configuracion para comenzar.</p>
        </div>
      </div>
    </div>
  );
}
