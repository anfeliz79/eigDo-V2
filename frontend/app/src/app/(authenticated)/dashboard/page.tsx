'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, type OnboardingStatus, type DocumentStats, type EcfDocument } from '@/lib/api';
import Link from 'next/link';

const statusLabels: Record<string, { label: string; class: string }> = {
  Draft: { label: 'Borrador', class: 'bg-gray-100 text-gray-700' },
  Queued: { label: 'En Cola', class: 'bg-yellow-100 text-yellow-700' },
  Submitted: { label: 'Enviado', class: 'bg-blue-100 text-blue-700' },
  Accepted: { label: 'Aceptado', class: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Rechazado', class: 'bg-red-100 text-red-700' },
  Annulled: { label: 'Anulado', class: 'bg-gray-200 text-gray-600' },
  BlockedByConfig: { label: 'Bloqueado', class: 'bg-orange-100 text-orange-700' },
  RetryPending: { label: 'Reintentando', class: 'bg-purple-100 text-purple-700' },
};

const ecfTypeLabels: Record<string, string> = {
  E31: 'Credito Fiscal', E32: 'Consumo', E33: 'Nota Debito', E34: 'Nota Credito',
  E41: 'Compras', E43: 'Gastos Menores', E44: 'Reg. Especial', E45: 'Gubernamental',
  E46: 'Exportacion', E47: 'Pagos Exterior',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<EcfDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getOnboardingStatus().then(setOnboarding).catch(() => {}),
      api.getDocumentStats().then(setStats).catch(() => {}),
      api.getDocuments(1, 5).then(res => setRecentDocs(res.items || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
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
          {greeting()}, {user?.firstName || 'Usuario'}
        </h1>
        <p className="text-gray-500 mt-1">Panel de control de facturacion electronica</p>
      </div>

      {/* Onboarding banner */}
      {!loading && onboarding && onboarding.completionPercentage < 100 && (
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
              <span>{onboarding.completionPercentage}%</span>
            </div>
            <div className="w-full bg-blue-800 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${onboarding.completionPercentage}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Documentos Hoy',
            value: stats?.todayCount ?? '--',
            sub: 'e-CF emitidos',
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            ),
            iconBg: 'bg-blue-50',
          },
          {
            title: 'Aceptados',
            value: stats?.accepted ?? '--',
            sub: 'por la DGII',
            icon: (
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ),
            iconBg: 'bg-green-50',
          },
          {
            title: 'Pendientes',
            value: stats?.pending ?? '--',
            sub: 'en proceso',
            icon: (
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ),
            iconBg: 'bg-yellow-50',
          },
          {
            title: 'Rechazados',
            value: stats?.rejected ?? '--',
            sub: 'requieren atencion',
            icon: (
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            ),
            iconBg: 'bg-red-50',
          },
        ].map((s) => (
          <div key={s.title} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500">{s.title}</p>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                {s.icon}
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{loading ? '--' : s.value}</p>
            <p className="mt-1 text-sm text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            href: '/documents',
            title: 'Ver Documentos',
            desc: 'Lista de comprobantes emitidos',
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
              </svg>
            ),
          },
          {
            href: '/settings/fiscal',
            title: 'Datos Fiscales',
            desc: 'RNC, razon social, configuracion',
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            ),
          },
          {
            href: '/settings/qbo',
            title: 'QuickBooks',
            desc: 'Gestionar integracion QBO',
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            ),
          },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition">
                {a.icon}
              </div>
              <h3 className="font-semibold text-gray-900">{a.title}</h3>
            </div>
            <p className="text-sm text-gray-500">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent documents */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Documentos Recientes</h3>
          <Link href="/documents" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver todos</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No hay documentos aun. Completa la configuracion para comenzar a emitir.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">e-NCF</th>
                <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentDocs.map(doc => {
                const st = statusLabels[doc.status] || { label: doc.status, class: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-mono text-gray-900">{doc.encf || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{ecfTypeLabels[doc.ecfType] || doc.ecfType}</td>
                    <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">
                      RD$ {doc.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.class}`}>{st.label}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{new Date(doc.createdAtUtc).toLocaleDateString('es-DO')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
