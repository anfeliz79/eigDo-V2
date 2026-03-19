'use client';

import { useEffect, useState } from 'react';
import { api, type FiscalSettings } from '@/lib/api';

export default function FiscalSettingsPage() {
  const [form, setForm] = useState<Partial<FiscalSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.getFiscalSettings()
      .then(setForm)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveFiscalSettings(form);
      setMessage({ type: 'success', text: 'Datos fiscales guardados correctamente' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Datos Fiscales</h1>
        <p className="text-gray-500 mt-1">Informacion del emisor (Ciclo 1)</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Identidad del Emisor</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="RNC / Cedula" value={form.rnc || ''} onChange={(v) => setForm({ ...form, rnc: v })} placeholder="131000000" />
          <Field label="Razon Social" value={form.razonSocial || ''} onChange={(v) => setForm({ ...form, razonSocial: v })} placeholder="Mi Empresa SRL" />
          <Field label="Nombre Comercial" value={form.nombreComercial || ''} onChange={(v) => setForm({ ...form, nombreComercial: v })} placeholder="Mi Marca" />
          <Field label="Telefono" value={form.telefono || ''} onChange={(v) => setForm({ ...form, telefono: v })} placeholder="809-555-1234" />
          <Field label="Correo Electronico" value={form.email || ''} onChange={(v) => setForm({ ...form, email: v })} placeholder="fiscal@empresa.com" className="md:col-span-2" />
          <Field label="Direccion" value={form.direccion || ''} onChange={(v) => setForm({ ...form, direccion: v })} placeholder="Calle Principal #1, Santo Domingo" className="md:col-span-2" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Valores por Defecto</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SelectField
            label="Tipo de Ingreso"
            value={String(form.defaultIncomeType || 1)}
            onChange={(v) => setForm({ ...form, defaultIncomeType: Number(v) })}
            options={[
              { value: '1', label: '01 - Ingresos por operaciones no financieras' },
              { value: '2', label: '02 - Ingresos financieros' },
              { value: '3', label: '03 - Ingresos extraordinarios' },
              { value: '4', label: '04 - Ingresos por arrendamientos' },
              { value: '5', label: '05 - Ingresos por venta de activos' },
              { value: '6', label: '06 - Otros ingresos' },
            ]}
          />
          <SelectField
            label="Indicador Bien/Servicio"
            value={String(form.defaultGoodServiceIndicator || 2)}
            onChange={(v) => setForm({ ...form, defaultGoodServiceIndicator: Number(v) })}
            options={[
              { value: '1', label: '1 - Bien' },
              { value: '2', label: '2 - Servicio' },
            ]}
          />
          <SelectField
            label="Unidad de Medida (por defecto)"
            value={String(form.defaultUnitMeasure || 43)}
            onChange={(v) => setForm({ ...form, defaultUnitMeasure: Number(v) })}
            options={[
              { value: '43', label: '43 - Unidad' },
              { value: '4', label: '04 - Libra' },
              { value: '18', label: '18 - Galon' },
              { value: '32', label: '32 - Metro cuadrado' },
              { value: '36', label: '36 - Hora' },
            ]}
          />
          <SelectField
            label="Sin Tax Code = ?"
            value={String(form.defaultNoTaxCodeBillingIndicator || 0)}
            onChange={(v) => setForm({ ...form, defaultNoTaxCodeBillingIndicator: Number(v) })}
            options={[
              { value: '0', label: '0 - No facturable (exento)' },
              { value: '1', label: '1 - ITBIS 18%' },
              { value: '2', label: '2 - ITBIS 16%' },
              { value: '3', label: '3 - ITBIS 0%' },
              { value: '4', label: '4 - Regimen especial' },
            ]}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, className = '' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
