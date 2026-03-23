'use client';

import { useEffect, useState, useRef } from 'react';
import { adminApi, type AdminTicket, type TicketDetail } from '@/lib/api';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  open: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const statusLabels: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En Progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const priorityBorder: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-amber-500',
  normal: 'border-l-blue-500',
  low: 'border-l-slate-300',
};

const priorityLabels: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const priorityPillColors: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700',
  high: 'bg-amber-50 text-amber-700',
  normal: 'bg-blue-50 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `hace ${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  return `hace ${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Slide-over detail
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages]);

  const openTicket = async (id: string) => {
    setPanelOpen(true);
    setDetailLoading(true);
    try {
      const detail = await adminApi.getTicketDetail(id);
      setSelectedTicket(detail);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelectedTicket(null), 300);
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

  const changePriority = async (priority: string) => {
    if (!selectedTicket) return;
    try {
      await adminApi.updateTicketStatus(selectedTicket.id, selectedTicket.status, priority);
      const detail = await adminApi.getTicketDetail(selectedTicket.id);
      setSelectedTicket(detail);
      loadTickets();
    } catch { /* ignore */ }
  };

  const statusFilterOptions = [
    { value: '', label: 'Todos' },
    { value: 'open', label: 'Abiertos' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'resolved', label: 'Resueltos' },
    { value: 'closed', label: 'Cerrados' },
  ];

  const priorityFilterOptions = [
    { value: '', label: 'Todas' },
    { value: 'urgent', label: 'Urgente' },
    { value: 'high', label: 'Alta' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Baja' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Soporte</h1>
        <p className="text-slate-500 mt-1">{total} ticket{total !== 1 ? 's' : ''} en total</p>
      </div>

      {/* Filter Pills */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Estado:</span>
          {statusFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Prioridad:</span>
          {priorityFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPriorityFilter(opt.value)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                priorityFilter === opt.value
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-slate-400">Cargando tickets...</p>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No hay tickets</p>
          <p className="text-sm text-slate-400 mt-1">Los tickets de soporte apareceran aqui</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {tickets.map((t) => {
            const sc = statusColors[t.status] || statusColors.open;
            const border = priorityBorder[t.priority] || priorityBorder.normal;
            return (
              <button
                key={t.id}
                onClick={() => openTicket(t.id)}
                className={`w-full text-left bg-white rounded-xl border border-slate-200 border-l-[3px] ${border} p-4 hover:shadow-md hover:border-slate-300 transition-all group`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                        {t.subject}
                      </h3>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {statusLabels[t.status] || t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <span className="truncate">{t.userEmail || t.contactEmail || 'N/A'}</span>
                      {t.companyName && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                          <span className="truncate">{t.companyName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityPillColors[t.priority] || priorityPillColors.normal}`}>
                      {priorityLabels[t.priority] || t.priority}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                      </svg>
                      <span>{t.messageCount}</span>
                    </div>
                    <span className="text-xs text-slate-400">{timeAgo(t.createdAtUtc)}</span>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Slide-over Panel */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${panelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={closePanel}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
            panelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                <p className="text-sm text-slate-400">Cargando ticket...</p>
              </div>
            </div>
          ) : selectedTicket ? (
            <>
              {/* Panel Header */}
              <div className="border-b border-slate-200 px-6 py-4 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-900 truncate">{selectedTicket.subject}</h2>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{selectedTicket.userName || selectedTicket.userEmail || selectedTicket.contactEmail || 'Anonimo'}</span>
                      {selectedTicket.companyName && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span>{selectedTicket.companyName}</span>
                        </>
                      )}
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{timeAgo(selectedTicket.createdAtUtc)}</span>
                    </div>
                  </div>
                  <button
                    onClick={closePanel}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Status & Priority selectors */}
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Estado:</span>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => changeStatus(e.target.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer transition ${
                        (statusColors[selectedTicket.status] || statusColors.open).bg
                      } ${(statusColors[selectedTicket.status] || statusColors.open).text}`}
                    >
                      <option value="open">Abierto</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="resolved">Resuelto</option>
                      <option value="closed">Cerrado</option>
                    </select>
                  </div>
                  <div className="w-px h-4 bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Prioridad:</span>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => changePriority(e.target.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer transition ${
                        priorityPillColors[selectedTicket.priority] || priorityPillColors.normal
                      }`}
                    >
                      <option value="low">Baja</option>
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50/50">
                {selectedTicket.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isStaffReply ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                        msg.isStaffReply
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                      }`}
                    >
                      <p className={`text-xs mb-1.5 font-medium ${msg.isStaffReply ? 'text-blue-200' : 'text-slate-400'}`}>
                        {msg.isStaffReply ? 'Soporte eigdo' : (msg.senderName || msg.senderEmail || 'Usuario')}
                        <span className="font-normal ml-1.5">
                          {timeAgo(msg.createdAtUtc)}
                        </span>
                      </p>
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${msg.isStaffReply ? 'text-white' : 'text-slate-700'}`}>
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="border-t border-slate-200 px-6 py-4 bg-white shrink-0">
                <div className="flex gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        sendReply();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="self-end px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition shadow-sm shadow-blue-600/20 disabled:shadow-none"
                  >
                    {sending ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Cmd+Enter para enviar</p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
