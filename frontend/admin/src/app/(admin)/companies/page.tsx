'use client';

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-500 mt-1">Gestion de empresas registradas en eigdo</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">RNC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">QBO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Onboarding</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">e-CF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Creada</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  Sin empresas registradas
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
