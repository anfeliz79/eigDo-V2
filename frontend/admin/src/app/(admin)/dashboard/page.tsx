'use client';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
        <p className="text-slate-500 mt-1">Vista general del sistema eigdo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Empresas Activas', value: '--', color: 'bg-blue-500' },
          { label: 'Suscripciones', value: '--', color: 'bg-green-500' },
          { label: 'e-CF Hoy', value: '--', color: 'bg-purple-500' },
          { label: 'Errores', value: '--', color: 'bg-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <span className="text-sm font-medium text-slate-500">{s.label}</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Empresas Recientes</h3>
          <div className="text-center text-slate-400 py-8">
            <p>No hay empresas registradas</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Actividad Reciente</h3>
          <div className="text-center text-slate-400 py-8">
            <p>Sin actividad reciente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
