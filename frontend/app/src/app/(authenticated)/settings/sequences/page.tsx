'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type SequenceDto, type OnboardingStatus } from '@/lib/api';

const ecfTypes = [
  { value: 'E31', label: 'E31 - Credito Fiscal' },
  { value: 'E32', label: 'E32 - Consumo' },
  { value: 'E33', label: 'E33 - Nota de Debito' },
  { value: 'E34', label: 'E34 - Nota de Credito' },
  { value: 'E41', label: 'E41 - Compras' },
  { value: 'E43', label: 'E43 - Gastos Menores' },
  { value: 'E44', label: 'E44 - Regimen Especial' },
  { value: 'E45', label: 'E45 - Gubernamental' },
  { value: 'E46', label: 'E46 - Exportacion' },
  { value: 'E47', label: 'E47 - Pagos al Exterior' },
];

interface SequenceForm {
  ecfType: string;
  rangeStart: string;
  rangeEnd: string;
  dueDateUtc: string;
  alertThreshold: string;
  isActive: boolean;
}

const emptyForm: SequenceForm = {
  ecfType: 'E31',
  rangeStart: '',
  rangeEnd: '',
  dueDateUtc: '',
  alertThreshold: '100',
  isActive: true,
};

function getStatusBadge(seq: SequenceDto) {
  if (seq.isExhausted) return { label: 'Agotada', className: 'bg-red-100 text-red-700' };
  if (seq.isExpired) return { label: 'Vencida', className: 'bg-amber-100 text-amber-700' };
  if (!seq.isActive) return { label: 'Inactiva', className: 'bg-gray-100 text-gray-600' };
  return { label: 'Activa', className: 'bg-green-100 text-green-700' };
}

function getProgressColor(percent: number) {
  if (percent >= 95) return 'bg-red-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-blue-500';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function SequencesPage() {
  const router = useRouter();
  const [sequences, setSequences] = useState<SequenceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SequenceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadSequences();
    api.getOnboardingStatus()
      .then((s: OnboardingStatus) => {
        setIsOnboarding(s.currentStep !== 'Complete' && s.completionPercentage < 100);
      })
      .catch(() => {});
  }, []);

  const loadSequences = () => {
    setLoading(true);
    api.getSequences()
      .then(setSequences)
      .catch(() => setSequences([]))
      .finally(() => setLoading(false));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setMessage(null);
  };

  const openEditForm = (seq: SequenceDto) => {
    setEditingId(seq.id);
    setForm({
      ecfType: seq.ecfType,
      rangeStart: String(seq.rangeStart),
      rangeEnd: String(seq.rangeEnd),
      dueDateUtc: seq.dueDateUtc ? seq.dueDateUtc.slice(0, 10) : '',
      alertThreshold: String(seq.alertThreshold),
      isActive: seq.isActive,
    });
    setShowForm(true);
    setMessage(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const rangeStart = parseInt(form.rangeStart, 10);
      const rangeEnd = parseInt(form.rangeEnd, 10);
      const alertThreshold = parseInt(form.alertThreshold, 10);

      if (isNaN(rangeStart) || isNaN(rangeEnd)) {
        setMessage({ type: 'error', text: 'Los numeros de inicio y fin son requeridos.' });
        setSaving(false);
        return;
      }

      if (!form.dueDateUtc) {
        setMessage({ type: 'error', text: 'La fecha de vencimiento es requerida.' });
        setSaving(false);
        return;
      }

      if (editingId) {
        await api.updateSequence(editingId, {
          rangeStart,
          rangeEnd,
          dueDateUtc: new Date(form.dueDateUtc).toISOString(),
          alertThreshold: isNaN(alertThreshold) ? 100 : alertThreshold,
          isActive: form.isActive,
        });
        setMessage({ type: 'success', text: 'Secuencia actualizada correctamente.' });
      } else {
        await api.createSequence({
          ecfType: form.ecfType,
          rangeStart,
          rangeEnd,
          dueDateUtc: new Date(form.dueDateUtc).toISOString(),
          alertThreshold: isNaN(alertThreshold) ? 100 : alertThreshold,
          isActive: form.isActive,
        });
        setMessage({ type: 'success', text: 'Secuencia creada correctamente.' });
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      loadSequences();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar la secuencia.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setMessage(null);
    try {
      await api.deleteSequence(id);
      setMessage({ type: 'success', text: 'Secuencia eliminada.' });
      loadSequences();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar.' });
    } finally {
      setDeleting(null);
    }
  };

  const handleComplete = async () => {
    try {
      await api.advanceOnboarding('Complete');
    } catch {}
    router.push('/onboarding');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Secuencias e-NCF</h1>
          <p className="text-gray-500 mt-1">Configura los rangos de numeracion asignados por la DGII para cada tipo de e-CF</p>
        </div>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar Secuencia
        </button>
      </div>

      {/* Summary */}
      {sequences.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Secuencias</p>
            <p className="text-2xl font-bold text-gray-900">{sequences.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Activas</p>
            <p className="text-2xl font-bold text-green-600">{sequences.filter(s => s.isActive && !s.isExhausted && !s.isExpired).length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Requieren Atencion</p>
            <p className="text-2xl font-bold text-amber-600">{sequences.filter(s => s.isExhausted || s.isExpired || s.percentUsed >= 80).length}</p>
          </div>
        </div>
      )}

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Editar Secuencia' : 'Nueva Secuencia'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo e-CF</label>
              <select
                value={form.ecfType}
                onChange={(e) => setForm({ ...form, ecfType: e.target.value })}
                disabled={!!editingId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              >
                {ecfTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numero Inicial</label>
              <input
                type="number"
                value={form.rangeStart}
                onChange={(e) => setForm({ ...form, rangeStart: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="1"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numero Final</label>
              <input
                type="number"
                value={form.rangeEnd}
                onChange={(e) => setForm({ ...form, rangeEnd: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="500"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
              <input
                type="date"
                value={form.dueDateUtc}
                onChange={(e) => setForm({ ...form, dueDateUtc: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Umbral de Alerta</label>
              <input
                type="number"
                value={form.alertThreshold}
                onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="100"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">Alertar cuando queden menos de este numero</p>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Activa</span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition"
            >
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Secuencia'}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : sequences.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h6m-6 0 .621 2.485A1.125 1.125 0 0 0 5.513 19.5h2.474c.489 0 .924-.315 1.074-.782L9.684 16.5m10.816 0h1.5m-16.5 0L3 8.25m0 0 1.5-1.5m0 0h16.5" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-1">Sin secuencias configuradas</h3>
            <p className="mb-4">Agrega las secuencias de numeracion asignadas por la DGII para comenzar a emitir comprobantes.</p>
            <button
              onClick={openCreateForm}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Agregar Primera Secuencia
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo e-CF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rango</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restantes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sequences.map((seq) => {
                  const status = getStatusBadge(seq);
                  const progressColor = getProgressColor(seq.percentUsed);

                  return (
                    <tr key={seq.id} className={`hover:bg-gray-50 ${seq.isExhausted || seq.isExpired ? 'bg-red-50/30' : seq.percentUsed >= 80 ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{seq.ecfTypeLabel || seq.ecfType}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{seq.rangeStart.toLocaleString()} - {seq.rangeEnd.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{seq.currentValue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-semibold ${seq.remainingCount <= seq.alertThreshold ? 'text-red-600' : 'text-gray-700'}`}>
                          {seq.remainingCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`${progressColor} rounded-full h-2 transition-all`}
                              style={{ width: `${Math.min(seq.percentUsed, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{seq.percentUsed}%</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${seq.isExpired ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {formatDate(seq.dueDateUtc)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => openEditForm(seq)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(seq.id)}
                          disabled={deleting === seq.id}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:text-red-300"
                        >
                          {deleting === seq.id ? '...' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboarding navigation */}
      {isOnboarding && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => router.push('/settings/certificate')}
            className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-900 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver a Certificado
          </button>
          <button
            onClick={handleComplete}
            className="px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            Completar Configuracion
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
