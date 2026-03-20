'use client';

import { useEffect, useState } from 'react';
import { api, type SupportTicketSummary, type SupportTicketDetail } from '@/lib/api';

const statusColors: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
};

const statusLabels: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En Progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const priorityLabels: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // New ticket form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [creating, setCreating] = useState(false);

  const loadTickets = () => {
    setLoading(true);
    api.getTickets()
      .then((res) => setTickets(res.items))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTickets(); }, []);

  const openTicket = async (id: string) => {
    setDetailLoading(true);
    try {
      const detail = await api.getTicketDetail(id);
      setSelectedTicket(detail);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);
    try {
      await api.replyToTicket(selectedTicket.id, replyText.trim());
      setReplyText('');
      const detail = await api.getTicketDetail(selectedTicket.id);
      setSelectedTicket(detail);
      loadTickets();
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      await api.createTicket({
        subject: newSubject.trim(),
        message: newMessage.trim(),
        priority: newPriority,
      });
      setNewSubject('');
      setNewMessage('');
      setNewPriority('normal');
      setShowNewForm(false);
      loadTickets();
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  // Detail view
  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedTicket(null)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Volver a tickets
        </button>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Creado el {new Date(selectedTicket.createdAtUtc).toLocaleString('es-DO')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {priorityLabels[selectedTicket.priority] || selectedTicket.priority}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedTicket.status] || 'bg-slate-100 text-slate-600'}`}>
                  {statusLabels[selectedTicket.status] || selectedTicket.status}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="px-6 py-4 space-y-4 max-h-[500px] overflow-y-auto">
            {selectedTicket.messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin mensajes</p>
            ) : (
              selectedTicket.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isStaffReply ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.isStaffReply
                      ? 'bg-blue-50 border border-blue-100'
                      : 'bg-gray-50 border border-gray-100'
                  }`}>
                    <p className="text-xs text-gray-500 mb-1">
                      {msg.isStaffReply ? 'Soporte eigdo' : 'Tu'}
                      {' '}&middot;{' '}{new Date(msg.createdAtUtc).toLocaleString('es-DO')}
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reply */}
          {selectedTicket.status !== 'closed' && (
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex gap-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition self-end"
                >
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // New ticket form
  if (showNewForm) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setShowNewForm(false)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Volver a tickets
        </button>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevo Ticket de Soporte</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Describe brevemente tu problema"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none"
              >
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Describe tu problema o consulta en detalle..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={createTicket}
                disabled={creating || !newSubject.trim() || !newMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                {creating ? 'Creando...' : 'Crear Ticket'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ticket list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soporte</h1>
          <p className="text-gray-500 mt-1">Tus tickets de soporte</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Ticket
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading || detailLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            <p className="text-gray-400">No tienes tickets de soporte</p>
            <p className="text-sm text-gray-400 mt-1">Crea uno si necesitas ayuda</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => openTicket(t.id)}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(t.createdAtUtc).toLocaleDateString('es-DO')}
                    {' '}&middot;{' '}{t.messageCount} {t.messageCount === 1 ? 'mensaje' : 'mensajes'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">
                    {priorityLabels[t.priority] || t.priority}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] || 'bg-slate-100 text-slate-600'}`}>
                    {statusLabels[t.status] || t.status}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
