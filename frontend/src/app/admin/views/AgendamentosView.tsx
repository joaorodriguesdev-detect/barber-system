'use client';

import { useState, useEffect } from 'react';
import { Check, Clock, Ban } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface AgendamentosViewProps {
  token: string;
  team: any[];
  servicesMap: Record<number, { name: string; price: number }>;
}

export default function AgendamentosView({ token, team, servicesMap }: AgendamentosViewProps) {
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [loadingAllAppointments, setLoadingAllAppointments] = useState(true);
  const [appointmentFilter, setAppointmentFilter] = useState<'todos' | 'mes'>('mes');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const fetchAllAppointments = async () => {
      setLoadingAllAppointments(true);
      try {
        const res = await fetch(`${API_BASE_URL}/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAllAppointments(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Erro ao buscar agendamentos", e);
      } finally {
        setLoadingAllAppointments(false);
      }
    };
    fetchAllAppointments();
  }, [token]);

  const handleAssignBarber = async (appId: number, barberId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/appointments/${appId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ barber_id: barberId })
      });
      if (res.ok) {
        setAllAppointments(prev => prev.map(a => a.id === appId ? { ...a, barber_id: barberId } : a));
      }
    } catch {
      alert("Erro ao transferir agendamento");
    }
  };

  const handleChangeStatus = async (appointmentId: number, newStatus: 'completed' | 'canceled') => {
    setProcessingId(appointmentId);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAllAppointments((prev) => prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a));
      } else {
        alert('Erro ao atualizar status');
      }
    } catch {
      alert('Erro de conexão ao atualizar status');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
        
        {/* HEADER DA ABA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-white text-xl font-bold">Gestão de Agendamentos</h2>
            <p className="text-zinc-500 text-sm mt-1">Aprove ou escolha o profissional que executou o serviço.</p>
          </div>
          <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setAppointmentFilter('mes')}
              className={`text-xs px-4 py-2 rounded-lg font-semibold transition ${
                appointmentFilter === 'mes' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setAppointmentFilter('todos')}
              className={`text-xs px-4 py-2 rounded-lg font-semibold transition ${
                appointmentFilter === 'todos' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* LISTAGEM DOS AGENDAMENTOS */}
        {loadingAllAppointments ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : allAppointments.length === 0 ? (
          <p className="text-center text-zinc-500 py-20">Nenhum agendamento encontrado no sistema.</p>
        ) : (
          <>
            {appointmentFilter === 'mes' && (
              <div className="mb-6">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-white/5">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/[0.02] text-zinc-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Data / Hora</th>
                    <th className="px-6 py-4 font-medium">Profissional</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allAppointments
                    .filter((a) => {
                      if (appointmentFilter === 'mes') {
                        const d = new Date(a.appointment_date);
                        const mesAno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        return mesAno === selectedMonth;
                      }
                      return true;
                    })
                    .map((app) => {
                      const notes = app.notes || '';
                      const nomeMatch = notes.match(/Cliente:\s*(.*?)(?:\s*-\s*Tel:|$)/);
                      const nome = nomeMatch ? nomeMatch[1].trim() : `Cliente #${app.customer_id}`;
                      const dataObj = new Date(app.appointment_date);

                      return (
                        <tr key={app.id} className="hover:bg-white/[0.02] transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold text-xs">
                                {nome.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-zinc-100 block">{nome}</span>
                                <span className="text-[10px] text-zinc-500">{servicesMap[app.service_id]?.name || `Serviço #${app.service_id}`}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-zinc-200 font-medium">{dataObj.toLocaleDateString('pt-BR')}</div>
                            <div className="text-zinc-500 text-xs">{dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          
                          {/* SELETOR DE BARBEIRO */}
                          <td className="px-6 py-4">
                            <select
                              value={app.barber_id}
                              onChange={(e) => handleAssignBarber(app.id, parseInt(e.target.value))}
                              className="bg-[#0A0A0A] text-amber-400 font-semibold border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:border-amber-500 outline-none w-32 cursor-pointer transition"
                            >
                              {(team || []).map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                              ${app.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                app.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                              {app.status === 'completed' && <Check size={10} />}
                              {app.status === 'pending' && <Clock size={10} />}
                              {app.status === 'canceled' && <Ban size={10} />}
                              {app.status === 'completed' ? 'Concluído' :
                               app.status === 'pending' ? 'Pendente' : 'Cancelado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {app.status === 'pending' ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleChangeStatus(app.id, 'completed')}
                                  disabled={processingId === app.id}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-2 rounded-lg transition disabled:opacity-50"
                                >
                                  Finalizar
                                </button>
                                <button
                                  onClick={() => handleChangeStatus(app.id, 'canceled')}
                                  disabled={processingId === app.id}
                                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-3 py-2 rounded-lg transition disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}