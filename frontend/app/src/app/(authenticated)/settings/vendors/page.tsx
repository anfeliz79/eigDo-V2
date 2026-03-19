'use client';

import { useEffect, useState } from 'react';
import { api, type VendorMapping } from '@/lib/api';

const ecfTypes = [
  { value: 'E41', label: 'E41 - Compras' },
  { value: 'E43', label: 'E43 - Gastos Menores' },
  { value: 'E47', label: 'E47 - Pagos al Exterior' },
];

export default function VendorMappingsPage() {
  const [mappings, setMappings] = useState<VendorMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VendorMapping>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = () => {
    setLoading(true);
    api.getVendorMappings()
      .then(setMappings)
      .catch(() => setMappings([]))
      .finally(() => setLoading(false));
  };

  const startEdit = (m: VendorMapping) => {
    setEditing(m.id);
    setEditForm({ ...m });
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
      await api.saveVendorMapping(editForm);
      setMessage({ type: 'success', text: 'Proveedor actualizado' });
      setEditing(null);
      loadMappings();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mapeo de Proveedores</h1>
        <p className="text-gray-500 mt-1">Ciclo 3: Asocia proveedores de QuickBooks con datos fiscales DGII</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : mappings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin proveedores mapeados</h3>
            <p>Conecta QuickBooks para sincronizar tus proveedores automaticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor QBO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RNC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razon Social DGII</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo e-CF</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ret. ITBIS %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ret. ISR %</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Excluido</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    {editing === m.id ? (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.qboDisplayName}</td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.rnc || ''}
                            onChange={(e) => setEditForm({ ...editForm, rnc: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="131000000"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.razonSocialDgii || ''}
                            onChange={(e) => setEditForm({ ...editForm, razonSocialDgii: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Nombre en DGII"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.tipoComprobante || 'E41'}
                            onChange={(e) => setEditForm({ ...editForm, tipoComprobante: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            {ecfTypes.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={editForm.retentionItbisRate != null ? (editForm.retentionItbisRate * 100).toFixed(0) : ''}
                            onChange={(e) => setEditForm({ ...editForm, retentionItbisRate: e.target.value ? Number(e.target.value) / 100 : undefined })}
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="30"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={editForm.retentionIsrRate != null ? (editForm.retentionIsrRate * 100).toFixed(0) : ''}
                            onChange={(e) => setEditForm({ ...editForm, retentionIsrRate: e.target.value ? Number(e.target.value) / 100 : undefined })}
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="10"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={editForm.excluido || false}
                            onChange={(e) => setEditForm({ ...editForm, excluido: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
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
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.qboDisplayName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{m.rnc || <span className="text-orange-500">Sin RNC</span>}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.razonSocialDgii || <span className="text-gray-400">&mdash;</span>}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.tipoComprobante}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{m.retentionItbisRate ? `${(m.retentionItbisRate * 100).toFixed(0)}%` : <span className="text-gray-400">&mdash;</span>}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{m.retentionIsrRate ? `${(m.retentionIsrRate * 100).toFixed(0)}%` : <span className="text-gray-400">&mdash;</span>}</td>
                        <td className="px-4 py-3 text-center">
                          {m.excluido ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Si</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => startEdit(m)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
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
