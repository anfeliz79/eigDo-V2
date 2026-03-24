'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type CompanyInfo } from '@/lib/api';

export default function CompanySwitcher() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentCompanyId =
    typeof window !== 'undefined' ? localStorage.getItem('eigdo_company') : null;

  const currentCompany = companies.find((c) => c.id === currentCompanyId) || companies[0];

  useEffect(() => {
    api
      .getMyCompanies()
      .then((data) => {
        setCompanies(data);
        // Si no hay empresa seleccionada, seleccionar la primera
        if (data.length > 0 && !localStorage.getItem('eigdo_company')) {
          localStorage.setItem('eigdo_company', data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (companyId: string) => {
    localStorage.setItem('eigdo_company', companyId);
    setOpen(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="h-9 w-40 bg-gray-100 rounded-lg animate-pulse" />
    );
  }

  if (companies.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left min-w-0 max-w-[220px]"
      >
        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-blue-700 text-xs font-bold">
            {currentCompany?.name?.charAt(0)?.toUpperCase() || 'E'}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-900 truncate">
          {currentCompany?.name || 'Empresa'}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-2">
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Tus empresas
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {companies.map((company) => {
              const isSelected = company.id === currentCompany?.id;
              return (
                <button
                  key={company.id}
                  onClick={() => handleSelect(company.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 text-sm font-bold">
                      {company.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {company.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {company.subscriptionStatus === 'Active'
                        ? company.planName ?? 'Suscripción activa'
                        : company.isOnboardingComplete
                        ? 'Sin suscripción'
                        : 'Configurando'}
                    </p>
                  </div>
                  <StatusDot company={company} />
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-blue-600 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-gray-100 mt-1 pt-1 px-2">
            <button
              onClick={() => {
                setOpen(false);
                router.push('/companies/new');
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Agregar Empresa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ company }: { company: CompanyInfo }) {
  if (company.subscriptionStatus === 'Active') {
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" title="Activa" />
    );
  }
  if (company.isOnboardingComplete) {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full bg-yellow-400 flex-shrink-0"
        title="Sin suscripción"
      />
    );
  }
  return (
    <span
      className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0"
      title="Configurando"
    />
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
        open ? 'rotate-180' : ''
      }`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
