'use client';

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Log de Auditoria</h1>
        <p className="text-slate-500 mt-1">Registro de actividad del sistema</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white">
          <option value="">Todas las empresas</option>
        </select>
        <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white">
          <option value="">Todas las acciones</option>
          <option value="login">Login</option>
          <option value="emission">Emision</option>
          <option value="webhook">Webhook</option>
          <option value="config">Configuracion</option>
        </select>
        <input
          type="date"
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white"
        />
      </div>

      {/* Audit log table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Accion</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                Sin registros de auditoria
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
