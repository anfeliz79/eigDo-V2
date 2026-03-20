'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminPlan, type AdminPrice } from '@/lib/api';

export default function PlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [editingPrice, setEditingPrice] = useState<AdminPrice | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Plan form
  const [planForm, setPlanForm] = useState({ name: '', description: '', maxCompanies: 1, includedDocumentsPerMonth: 100, sortOrder: 1, isActive: true });
  // Price form
  const [priceForm, setPriceForm] = useState({ amount: 0, currency: 'DOP', interval: 'monthly', isActive: true });
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
    setPriceForm({ amount: 0, currency: 'DOP', interval: 'monthly', isActive: true });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planes y Precios</h1>
          <p className="text-slate-500 mt-1">Gestion de planes de suscripcion y precios</p>
        </div>
        <button onClick={openCreatePlan} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
          Nuevo Plan
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">No hay planes configurados</div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-white rounded-xl border ${plan.isActive ? 'border-slate-200' : 'border-red-200 bg-red-50/30'} overflow-hidden`}>
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                    <p className="text-sm text-slate-500">{plan.description || 'Sin descripcion'}</p>
                  </div>
                  {!plan.isActive && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Inactivo</span>}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{plan.maxCompanies} empresa{plan.maxCompanies !== 1 ? 's' : ''}</span>
                  <span>{plan.includedDocumentsPerMonth} e-CF/mes</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">Orden: {plan.sortOrder}</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{plan.subscriberCount} suscriptor{plan.subscriberCount !== 1 ? 'es' : ''}</span>
                  <button onClick={() => openEditPlan(plan)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Editar</button>
                  {plan.isActive && <button onClick={() => deletePlan(plan.id)} className="text-red-600 hover:text-red-800 font-medium text-xs">Desactivar</button>}
                </div>
              </div>

              {/* Prices table */}
              <div className="px-6 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-slate-500 uppercase">Precios</h4>
                  <button onClick={() => openCreatePrice(plan.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Agregar Precio</button>
                </div>
                {plan.prices.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin precios configurados</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-slate-400 uppercase">
                        <th className="text-left py-1">Intervalo</th>
                        <th className="text-right py-1">Monto</th>
                        <th className="text-left py-1">Moneda</th>
                        <th className="text-center py-1">Estado</th>
                        <th className="text-right py-1">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.prices.map((price) => (
                        <tr key={price.id} className="border-t border-slate-50">
                          <td className="py-2 text-sm text-slate-700 capitalize">{price.interval === 'monthly' ? 'Mensual' : 'Anual'}</td>
                          <td className="py-2 text-sm text-slate-900 text-right font-mono">{price.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 text-sm text-slate-500">{price.currency}</td>
                          <td className="py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${price.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {price.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-2 text-right space-x-2">
                            <button onClick={() => openEditPrice(plan.id, price)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                            {price.isActive && <button onClick={() => deletePrice(price.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Desactivar</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">{editingPlan ? 'Editar Plan' : 'Nuevo Plan'}</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input type="text" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
                <textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max. Empresas</label>
                  <input type="number" value={planForm.maxCompanies} onChange={(e) => setPlanForm({ ...planForm, maxCompanies: Number(e.target.value) })} min={1} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">e-CF/mes</label>
                  <input type="number" value={planForm.includedDocumentsPerMonth} onChange={(e) => setPlanForm({ ...planForm, includedDocumentsPerMonth: Number(e.target.value) })} min={0} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Orden</label>
                  <input type="number" value={planForm.sortOrder} onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })} min={1} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              {editingPlan && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={planForm.isActive} onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })} className="rounded" />
                  Plan activo
                </label>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
              <button onClick={savePlan} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">{editingPrice ? 'Editar Precio' : 'Nuevo Precio'}</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
                <input type="number" value={priceForm.amount} onChange={(e) => setPriceForm({ ...priceForm, amount: Number(e.target.value) })} min={0} step={0.01} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
                  <select value={priceForm.currency} onChange={(e) => setPriceForm({ ...priceForm, currency: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none">
                    <option value="DOP">DOP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Intervalo</label>
                  <select value={priceForm.interval} onChange={(e) => setPriceForm({ ...priceForm, interval: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none">
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>
              {editingPrice && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={priceForm.isActive} onChange={(e) => setPriceForm({ ...priceForm, isActive: e.target.checked })} className="rounded" />
                  Precio activo
                </label>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowPriceModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
              <button onClick={savePrice} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
