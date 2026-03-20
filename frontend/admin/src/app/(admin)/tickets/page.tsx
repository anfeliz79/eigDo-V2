'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminTicket, type TicketDetail } from '@/lib/api';

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

const priorityColors: Record<string, string> = {
  low: 'text-slate-500',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600 font-semibold',
};

const priorityLabels: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Detail view
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadTickets = () => {
    setLoading(true);
    adminApi.getTickets({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    })
      .then((res) => { setTickets(res.items); setTotal(res.total); })
      .catch(() => { setTickets([]); setTotal(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTickets(); }, [statusFilter, priorityFilter]);

  const openTicket = async (id: string) => {
    setDetailLoading(true);
    try {
      const detail = await adminApi.getTicketDetail(id);
      setSelectedTicket(detail);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);
    try {
      await adminApi.replyToTicket(selectedTicket.id, replyText.trim());
      setReplyText('');
      const detail = await adminApi.getTicketDetail(selectedTicket.id);
      setSelectedTicket(detail);
      loadTickets();
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const changeStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await adminApi.updateTicketStatus(selectedTicket.id, status);
      const detail = await adminApi.getTicketDetail(selectedTicket.id);
      setSelectedTicket(detail);
      loadTickets();
    } catch { /* ignore */ }
  };

  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedTicket(null)} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Volver a tickets
        </button>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedTicket.subject}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedTicket.userName || selectedTicket.userEmail || selectedTicket.contactEmail || 'Anonimo'}
                  {selectedTicket.companyName && <span> - {selectedTicket.companyName}</span>}
                  {' '}&middot;{' '}
                  {new Date(selectedTicket.createdAtUtc).toLocaleString('es-DO')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[selectedTicket.priority] || ''}`}>
                  {priorityLabels[selectedTicket.priority] || selectedTicket.priority}
                </span>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => changeStatus(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-sm text-slate-700 outline-none"
                >
                  <option value="open">Abierto</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="resolved">Resuelto</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="px-6 py-4 space-y-4 max-h-[500px] overflow-y-auto">
            {selectedTicket.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isStaffReply ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.isStaffReply ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50 border border-slate-100'}`}>
                  <p className="text-xs text-slate-500 mb-1">
                    {msg.isStaffReply ? 'Soporte eigdo' : (msg.senderName || msg.senderEmail || 'Usuario')}
                    {' '}&middot;{' '}{new Date(msg.createdAtUtc).toLocaleString('es-DO')}
                  </p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply */}
          <div className="px-6 py-4 border-t border-slate-100">
            <div className="flex gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escribe tu respuesta..."
                rows={2}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
              <button
                onClick={sendReply}
                disabled={sending || !replyText.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition self-end"
              >
                {sending ? 'Enviando...' : 'Responder'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Soporte - Tickets</h1>
        <p className="text-slate-500 mt-1">Gestion de tickets de soporte ({total} total)</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none">
          <option value="">Todos los estados</option>
          <option value="open">Abierto</option>
          <option value="in_progress">En Progreso</option>
          <option value="resolved">Resuelto</option>
          <option value="closed">Cerrado</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none">
          <option value="">Todas las prioridades</option>
          <option value="low">Baja</option>
          <option value="normal">Normal</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading || detailLoading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Sin tickets</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Asunto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Remitente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Prioridad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Mensajes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openTicket(t.id)}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.subject}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.userEmail || t.contactEmail || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.companyName || <span className="text-slate-400">Publico</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] || 'bg-slate-100 text-slate-600'}`}>
                        {statusLabels[t.status] || t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${priorityColors[t.priority] || 'text-slate-500'}`}>
                        {priorityLabels[t.priority] || t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{t.messageCount}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.createdAtUtc).toLocaleDateString('es-DO')}</td>
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
