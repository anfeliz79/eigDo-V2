'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminCompany } from '@/lib/api';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCompanies = (p = page, s = search) => {
    setLoading(true);
    adminApi.getCompanies(p, 50, s || undefined)
      .then((res) => {
        setCompanies(res.items);
        setTotal(res.total);
      })
      .catch(() => { setCompanies([]); setTotal(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCompanies(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCompanies(1, search);
  };

  const toggleActive = async (id: string) => {
    try {
      await adminApi.toggleCompanyActive(id);
      loadCompanies();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-500 mt-1">Gestion de empresas registradas en eigdo ({total} total)</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o RNC..."
          className="flex-1 max-w-sm px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
          Buscar
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Sin empresas registradas</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">RNC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">QBO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Onboarding</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">e-CF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Creada</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{c.name}</div>
                      <span className={`text-xs ${c.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {c.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{c.rnc || <span className="text-orange-500">Sin RNC</span>}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.planName || <span className="text-slate-400">Sin plan</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex w-2.5 h-2.5 rounded-full ${c.qboConnected ? 'bg-green-500' : 'bg-slate-300'}`} />
                    </td>
                    <td className="px-4 py-3">
                      {c.isOnboardingComplete ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Completo</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{c.onboardingStep}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right font-mono">{c.ecfCount}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.createdAtUtc).toLocaleDateString('es-DO')}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleActive(c.id)}
                        className={`text-xs font-medium ${c.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {c.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-sm text-slate-500">Pagina {page} de {Math.ceil(total / 50)}</span>
            <div className="space-x-2">
              <button disabled={page <= 1} onClick={() => { setPage(page - 1); loadCompanies(page - 1); }} className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50">Anterior</button>
              <button disabled={page * 50 >= total} onClick={() => { setPage(page + 1); loadCompanies(page + 1); }} className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
