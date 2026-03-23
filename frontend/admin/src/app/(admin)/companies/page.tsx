'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { adminApi, type AdminCompany } from '@/lib/api';

const PAGE_SIZE = 50;

const ONBOARDING_STEPS: Record<string, { label: string; percent: number }> = {
  'Created': { label: 'Creada', percent: 10 },
  'QboConnected': { label: 'QBO Conectado', percent: 40 },
  'MappingConfigured': { label: 'Mapeo configurado', percent: 60 },
  'AlanubeConfigured': { label: 'Alanube configurado', percent: 80 },
  'Complete': { label: 'Completo', percent: 100 },
};

function getPlanColor(plan?: string): string {
  if (!plan) return 'bg-gray-100 text-gray-600';
  const lower = plan.toLowerCase();
  if (lower.includes('enterprise') || lower.includes('premium')) return 'bg-purple-100 text-purple-700';
  if (lower.includes('pro') || lower.includes('profesional')) return 'bg-blue-100 text-blue-700';
  if (lower.includes('starter') || lower.includes('básico') || lower.includes('basico')) return 'bg-emerald-100 text-emerald-700';
  return 'bg-indigo-100 text-indigo-700';
}

function getOnboardingInfo(step: string, isComplete: boolean): { label: string; percent: number } {
  if (isComplete) return { label: 'Completo', percent: 100 };
  return ONBOARDING_STEPS[step] || { label: step || 'Pendiente', percent: 5 };
}

// Skeleton row for loading state
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4">
        <div className="h-4 bg-gray-200 rounded-lg w-36 mb-2" />
        <div className="h-3 bg-gray-100 rounded-lg w-24" />
      </td>
      <td className="px-5 py-4"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 bg-gray-200 rounded-full" />
          <div className="h-3 bg-gray-100 rounded-lg w-20" />
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="h-2 bg-gray-200 rounded-full w-24 mb-1.5" />
        <div className="h-3 bg-gray-100 rounded-lg w-12" />
      </td>
      <td className="px-5 py-4"><div className="h-3 bg-gray-100 rounded-lg w-16" /></td>
      <td className="px-5 py-4"><div className="h-3 bg-gray-100 rounded-lg w-20" /></td>
      <td className="px-5 py-4 text-right"><div className="h-8 bg-gray-200 rounded-lg w-20 ml-auto" /></td>
    </tr>
  );
}

// Skeleton card for mobile loading
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-4 bg-gray-200 rounded-lg w-36 mb-2" />
          <div className="h-3 bg-gray-100 rounded-lg w-24" />
        </div>
        <div className="h-8 bg-gray-200 rounded-lg w-20" />
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-100 rounded-lg w-full" />
        <div className="h-3 bg-gray-100 rounded-lg w-3/4" />
        <div className="h-2 bg-gray-200 rounded-full w-full" />
      </div>
    </div>
  );
}

// Search icon SVG
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

// Empty state illustration
function EmptyState({ search }: { search: string }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center px-6">
      <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {search ? 'Sin resultados' : 'Sin empresas registradas'}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm">
        {search
          ? `No se encontraron empresas que coincidan con "${search}". Intenta con otro termino de busqueda.`
          : 'Aun no hay empresas registradas en la plataforma.'}
      </p>
    </div>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadCompanies = useCallback((p = page, s = search) => {
    setLoading(true);
    adminApi.getCompanies(p, PAGE_SIZE, s || undefined)
      .then((res) => {
        setCompanies(res.items);
        setTotal(res.total);
      })
      .catch(() => { setCompanies([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { loadCompanies(1, ''); }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadCompanies(1, value);
    }, 400);
  };

  const toggleActive = async (id: string) => {
    setTogglingId(id);
    try {
      await adminApi.toggleCompanyActive(id);
      loadCompanies();
    } catch { /* ignore */ }
    finally { setTogglingId(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    loadCompanies(p, search);
  };

  // Generate pagination page numbers
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (page > 3) pages.push('ellipsis');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gestiona las empresas registradas
            {!loading && <span className="text-gray-400"> &middot; {total} empresa{total !== 1 ? 's' : ''}</span>}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre o RNC..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
              transition-all duration-200"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">QuickBooks</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Onboarding</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">e-CF</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creada</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState search={search} />
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                  const onboarding = getOnboardingInfo(c.onboardingStep, c.isOnboardingComplete);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                      {/* Company name + RNC */}
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">
                          {c.rnc || <span className="text-orange-400 font-sans">Sin RNC</span>}
                        </div>
                      </td>

                      {/* Plan pill */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getPlanColor(c.planName)}`}>
                          {c.planName || 'Sin plan'}
                        </span>
                      </td>

                      {/* QBO status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex w-2 h-2 rounded-full ${c.qboConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          <span className={`text-xs font-medium ${c.qboConnected ? 'text-emerald-700' : 'text-red-500'}`}>
                            {c.qboConnected ? 'Conectado' : 'Desconectado'}
                          </span>
                        </div>
                      </td>

                      {/* Onboarding progress */}
                      <td className="px-5 py-4">
                        <div className="w-28">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-600">{onboarding.percent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                onboarding.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${onboarding.percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">{onboarding.label}</span>
                        </div>
                      </td>

                      {/* e-CF count */}
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-mono text-gray-700">{c.ecfCount.toLocaleString('es-DO')}</span>
                      </td>

                      {/* Created date */}
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-500">{new Date(c.createdAtUtc).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => toggleActive(c.id)}
                          disabled={togglingId === c.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                            ${togglingId === c.id ? 'opacity-50 cursor-not-allowed' : ''}
                            ${c.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-700'
                              : 'bg-red-50 text-red-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          {c.isActive ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (desktop) */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Mostrando <span className="font-medium text-gray-700">{(page - 1) * PAGE_SIZE + 1}</span> a{' '}
              <span className="font-medium text-gray-700">{Math.min(page * PAGE_SIZE, total)}</span> de{' '}
              <span className="font-medium text-gray-700">{total}</span> empresas
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg
                  hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              {getPageNumbers().map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg
                  hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <EmptyState search={search} />
          </div>
        ) : (
          companies.map((c) => {
            const onboarding = getOnboardingInfo(c.onboardingStep, c.isOnboardingComplete);
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                {/* Top: name + toggle */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{c.name}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {c.rnc || <span className="text-orange-400 font-sans">Sin RNC</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(c.id)}
                    disabled={togglingId === c.id}
                    className={`shrink-0 ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${togglingId === c.id ? 'opacity-50 cursor-not-allowed' : ''}
                      ${c.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-600'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    {c.isActive ? 'Activa' : 'Inactiva'}
                  </button>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold">Plan</span>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getPlanColor(c.planName)}`}>
                        {c.planName || 'Sin plan'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold">QuickBooks</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-2 h-2 rounded-full ${c.qboConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      <span className={`font-medium ${c.qboConnected ? 'text-emerald-700' : 'text-red-500'}`}>
                        {c.qboConnected ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold">e-CF</span>
                    <div className="mt-1 font-mono text-gray-700 font-medium">{c.ecfCount.toLocaleString('es-DO')}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold">Creada</span>
                    <div className="mt-1 text-gray-600">{new Date(c.createdAtUtc).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Onboarding bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Onboarding</span>
                    <span className="text-xs font-medium text-gray-600">{onboarding.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        onboarding.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${onboarding.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">{onboarding.label}</span>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination (mobile) */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl
                hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">
              {page} <span className="text-gray-400">de</span> {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl
                hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
