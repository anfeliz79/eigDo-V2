'use client';

const plans = [
  { name: 'Basico', price: 'RD$ 2,500', docs: '50 e-CF/mes', features: ['1 empresa', 'Soporte email'] },
  { name: 'Profesional', price: 'RD$ 5,900', docs: '200 e-CF/mes', features: ['3 empresas', 'Soporte prioritario', 'API access'] },
  { name: 'Enterprise', price: 'RD$ 12,900', docs: 'Ilimitados', features: ['Empresas ilimitadas', 'Soporte dedicado', 'API access', 'SLA 99.9%'] },
];

export default function PlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Planes y Precios</h1>
        <p className="text-slate-500 mt-1">Configuracion de planes de suscripcion</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.name} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">{plan.price}<span className="text-sm text-slate-400 font-normal">/mes</span></p>
            </div>
            <p className="text-sm text-slate-600 font-medium">{plan.docs}</p>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <span className="text-xs text-slate-400">Suscriptores activos: --</span>
            </div>
          </div>
        ))}
      </div>

      {/* Subscriptions table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Suscripciones Activas</h3>
        </div>
        <div className="p-8 text-center text-slate-400">Sin suscripciones activas</div>
      </div>
    </div>
  );
}
