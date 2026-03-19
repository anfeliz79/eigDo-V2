'use client';

import { useEffect, useState } from 'react';
import { api, type ItemOverride } from '@/lib/api';

const goodServiceOptions = [
  { value: 0, label: 'Default (usar configuracion fiscal)' },
  { value: 1, label: 'Bien' },
  { value: 2, label: 'Servicio' },
];

export default function ItemOverridesPage() {
  const [items, setItems] = useState<ItemOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ItemOverride>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = () => {
    setLoading(true);
    api.getItemOverrides()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const startEdit = (item: ItemOverride) => {
    setEditing(item.id);
    setEditForm({ ...item });
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveItemOverride(editForm);
      setMessage({ type: 'success', text: 'Override actualizado' });
      setEditing(null);
      loadItems();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overrides de Items</h1>
        <p className="text-gray-500 mt-1">Ciclo 5: Personaliza unidad de medida y tipo bien/servicio por item</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
        <strong>Nota:</strong> Solo necesitas overrides cuando un item especifico requiere valores distintos a los defaults configurados en tus datos fiscales. La mayoria de empresas no necesitan overrides.
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin overrides configurados</h3>
            <p>Los items usaran los valores por defecto de tus datos fiscales. Agrega overrides solo cuando un item necesite valores distintos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item QBO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad de Medida</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bien/Servicio</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {editing === item.id ? (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.qboItemName}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            value={editForm.unitMeasureOverride ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, unitMeasureOverride: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Codigo"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.goodServiceIndicatorOverride ?? 0}
                            onChange={(e) => setEditForm({ ...editForm, goodServiceIndicatorOverride: Number(e.target.value) || undefined })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            {goodServiceOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                          <button onClick={saveEdit} disabled={saving} className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:bg-blue-400 transition">
                            {saving ? '...' : 'Guardar'}
                          </button>
                          <button onClick={cancelEdit} className="px-3 py-1 border border-gray-300 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition">
                            Cancelar
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.qboItemName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.unitMeasureOverride ? (
                            <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono">{item.unitMeasureOverride}</span>
                          ) : (
                            <span className="text-gray-400">Default</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.goodServiceIndicatorOverride === 1 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Bien</span>
                          ) : item.goodServiceIndicatorOverride === 2 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">Servicio</span>
                          ) : (
                            <span className="text-gray-400">Default</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => startEdit(item)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Editar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
