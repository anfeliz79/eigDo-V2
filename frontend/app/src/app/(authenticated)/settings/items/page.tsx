'use client';

import { useEffect, useState } from 'react';
import { api, type ItemOverride } from '@/lib/api';

export default function ItemOverridesPage() {
  const [items, setItems] = useState<ItemOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getItemOverrides()
      .then(setItems)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overrides de Items</h1>
        <p className="text-gray-500 mt-1">Ciclo 5: Personaliza unidad de medida y tipo bien/servicio por item</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin overrides configurados</h3>
            <p>Los items usaran los valores por defecto de tus datos fiscales. Agrega overrides solo cuando un item necesite valores distintos.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item QBO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad de Medida</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bien/Servicio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.qboItemName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.unitMeasureOverride ?? 'Default'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.goodServiceIndicatorOverride === 1 ? 'Bien' : item.goodServiceIndicatorOverride === 2 ? 'Servicio' : 'Default'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
