'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminPlan, type AdminPrice } from '@/lib/api';

const PLAN_COLORS = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-violet-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function intervalLabel(interval: string) {
  return interval === 'monthly' ? 'Mensual' : interval === 'yearly' ? 'Anual' : interval;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [editingPrice, setEditingPrice] = useState<AdminPrice | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [planForm, setPlanForm] = useState({ name: '', description: '', maxCompanies: 1, includedDocumentsPerMonth: 100, sortOrder: 1, isActive: true });
  const [priceForm, setPriceForm] = useState({ amount: 0, currency: 'USD', interval: 'monthly', isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPlans = () => {
    setLoading(true);
    adminApi.getPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPlans(); }, []);

  // Plan CRUD
  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({ name: '', description: '', maxCompanies: 1, includedDocumentsPerMonth: 100, sortOrder: plans.length + 1, isActive: true });
    setShowPlanModal(true);
    setError('');
  };

  const openEditPlan = (plan: AdminPlan) => {
    setEditingPlan(plan);
    setPlanForm({ name: plan.name, description: plan.description || '', maxCompanies: plan.maxCompanies, includedDocumentsPerMonth: plan.includedDocumentsPerMonth, sortOrder: plan.sortOrder, isActive: plan.isActive });
    setShowPlanModal(true);
    setError('');
  };

  const savePlan = async () => {
    if (!planForm.name.trim()) { setError('Nombre es requerido.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingPlan) {
        await adminApi.updatePlan(editingPlan.id, planForm);
      } else {
        await adminApi.createPlan(planForm);
      }
      setShowPlanModal(false);
      loadPlans();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Desactivar este plan?')) return;
    try {
      await adminApi.deletePlan(id);
      loadPlans();
    } catch { /* ignore */ }
  };

  // Price CRUD
  const openCreatePrice = (planId: string) => {
    setSelectedPlanId(planId);
    setEditingPrice(null);
    setPriceForm({ amount: 0, currency: 'USD', interval: 'monthly', isActive: true });
    setShowPriceModal(true);
    setError('');
  };

  const openEditPrice = (planId: string, price: AdminPrice) => {
    setSelectedPlanId(planId);
    setEditingPrice(price);
    setPriceForm({ amount: price.amount, currency: price.currency, interval: price.interval, isActive: price.isActive });
    setShowPriceModal(true);
    setError('');
  };

  const savePrice = async () => {
    if (priceForm.amount <= 0) { setError('Monto debe ser mayor a 0.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingPrice) {
        await adminApi.updatePrice(editingPrice.id, priceForm);
      } else if (selectedPlanId) {
        await adminApi.createPrice(selectedPlanId, priceForm);
      }
      setShowPriceModal(false);
      loadPlans();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const deletePrice = async (id: string) => {
    if (!confirm('Desactivar este precio?')) return;
    try {
      await adminApi.deletePrice(id);
      loadPlans();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planes y Precios</h1>
          <p className="text-slate-500 mt-1">Administra los planes de suscripcion y sus precios</p>
        </div>
        <button
          onClick={openCreatePlan}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm shadow-blue-600/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Plan
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-slate-400">Cargando planes...</p>
          </div>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No hay planes configurados</p>
          <p className="text-sm text-slate-400 mt-1">Crea tu primer plan para comenzar</p>
          <button onClick={openCreatePlan} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition">
            Crear Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan, idx) => {
            const color = PLAN_COLORS[idx % PLAN_COLORS.length];
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border ${plan.isActive ? 'border-slate-200' : 'border-red-200'} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
              >
                {/* Colored top accent */}
                <div className={`h-1.5 bg-gradient-to-r ${color}`} />

                {/* Card header */}
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{plan.name}</h3>
                        {!plan.isActive && (
                          <span className="shrink-0 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-semibold rounded-full uppercase tracking-wide">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{plan.description || 'Sin descripcion'}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => openEditPlan(plan)}
                        title="Editar plan"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      {plan.isActive && (
                        <button
                          onClick={() => deletePlan(plan.id)}
                          title="Desactivar plan"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span>{plan.includedDocumentsPerMonth} e-CF/mes</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200" />
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                      </svg>
                      <span>{plan.maxCompanies} empresa{plan.maxCompanies !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200" />
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      #{plan.sortOrder}
                    </span>
                  </div>

                  {/* Subscriber badge */}
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      {plan.subscriberCount} suscriptor{plan.subscriberCount !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </div>

                {/* Prices section */}
                <div className="border-t border-slate-100 px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Precios</h4>
                    <button
                      onClick={() => openCreatePrice(plan.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Agregar
                    </button>
                  </div>

                  {plan.prices.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Sin precios configurados</p>
                  ) : (
                    <div className="space-y-2">
                      {plan.prices.map((price) => (
                        <div
                          key={price.id}
                          className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${
                            price.isActive ? 'bg-slate-50' : 'bg-red-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-slate-900">
                              {formatCurrency(price.amount, price.currency)}
                            </span>
                            <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                              USD
                            </span>
                            <span className="text-xs text-slate-500">
                              / {intervalLabel(price.interval).toLowerCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {!price.isActive && (
                              <span className="text-[10px] font-semibold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">
                                Inactivo
                              </span>
                            )}
                            <button
                              onClick={() => openEditPrice(plan.id, price)}
                              title="Editar precio"
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            {price.isActive && (
                              <button
                                onClick={() => deletePrice(price.id)}
                                title="Desactivar precio"
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPlanModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl ring-1 ring-black/5">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {editingPlan ? 'Modifica los datos del plan' : 'Configura un nuevo plan de suscripcion'}
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del plan</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="Ej: Plan Profesional"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripcion</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  rows={2}
                  placeholder="Descripcion breve del plan"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Max. Empresas</label>
                  <input
                    type="number"
                    value={planForm.maxCompanies}
                    onChange={(e) => setPlanForm({ ...planForm, maxCompanies: Number(e.target.value) })}
                    min={1}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">e-CF/mes</label>
                  <input
                    type="number"
                    value={planForm.includedDocumentsPerMonth}
                    onChange={(e) => setPlanForm({ ...planForm, includedDocumentsPerMonth: Number(e.target.value) })}
                    min={0}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Orden</label>
                  <input
                    type="number"
                    value={planForm.sortOrder}
                    onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })}
                    min={1}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>
              {editingPlan && (
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  Plan activo
                </label>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={savePlan}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition shadow-sm shadow-blue-600/20"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </span>
                ) : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPriceModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl ring-1 ring-black/5">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPrice ? 'Editar Precio' : 'Nuevo Precio'}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {editingPrice ? 'Modifica el precio existente' : 'Agrega un precio al plan'}
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    value={priceForm.amount}
                    onChange={(e) => setPriceForm({ ...priceForm, amount: Number(e.target.value) })}
                    min={0}
                    step={0.01}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Moneda</label>
                  <select
                    value={priceForm.currency}
                    onChange={(e) => setPriceForm({ ...priceForm, currency: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white"
                  >
                    <option value="USD">USD (Dolares)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Intervalo</label>
                  <select
                    value={priceForm.interval}
                    onChange={(e) => setPriceForm({ ...priceForm, interval: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>
              {editingPrice && (
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priceForm.isActive}
                    onChange={(e) => setPriceForm({ ...priceForm, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  Precio activo
                </label>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => setShowPriceModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={savePrice}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition shadow-sm shadow-blue-600/20"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </span>
                ) : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
