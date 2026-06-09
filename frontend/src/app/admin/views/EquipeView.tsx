'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Users, UserPlus, X, UserCircle, Percent } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface EquipeViewProps {
  token: string;
  team: any[];
  fetchTeam: () => void;
  servicesMap: Record<number, { name: string; price: number }>;
}

export default function EquipeView({ token, team, fetchTeam, servicesMap }: EquipeViewProps) {
  // Estados isolados da aba Equipe
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberPhone, setNewBarberPhone] = useState('');
  const [creatingBarber, setCreatingBarber] = useState(false);
  const [commissions, setCommissions] = useState<Record<number, number>>({});
  
  // Estado local para calcular os rendimentos da equipe
  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);

  // Busca os atendimentos concluídos assim que a aba é aberta para calcular a grana
  useEffect(() => {
    const fetchCompletedAppointments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCompletedAppointments((data || []).filter((a: any) => a.status === 'completed'));
        }
      } catch (e) {
        console.error("Erro ao buscar atendimentos concluídos", e);
      }
    };
    
    fetchCompletedAppointments();
  }, [token]);

  // Função para criar o barbeiro
  const handleCreateBarber = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBarberName.trim()) return;
    setCreatingBarber(true);
    
    try {
      const res = await fetch(`${API_BASE_URL}/admin/barbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newBarberName.trim(),
          phone: newBarberPhone.trim() || "00000000000",
        }),
      });

      if (res.ok) {
        await fetchTeam(); // Avisa o Shell para atualizar o estado global
        setShowTeamForm(false);
        setNewBarberName(''); 
        setNewBarberPhone('');
      } else {
        alert('Erro ao criar profissional.');
      }
    } catch {
      alert('Erro de conexão ao criar profissional.');
    } finally {
      setCreatingBarber(false);
    }
  };

  // Função de cálculo isolada
  const getBarberMetrics = (barberId: number) => {
    const cuts = completedAppointments.filter(a => a.barber_id === barberId);
    const revenue = cuts.reduce((acc, curr) => acc + (servicesMap[curr.service_id]?.price || 0), 0);
    return { cutsCount: cuts.length, revenue };
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
        
        {/* HEADER DA ABA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              <Users size={22} className="text-violet-400" /> Equipe e Comissões
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Cadastre novos profissionais e acompanhe o rendimento.</p>
          </div>
          <button
            onClick={() => setShowTeamForm(!showTeamForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-lg"
          >
            {showTeamForm ? <X size={16} /> : <UserPlus size={16} />}
            {showTeamForm ? 'Cancelar' : 'Novo Funcionário'}
          </button>
        </div>

        {/* FORMULÁRIO DE CRIAÇÃO */}
        {showTeamForm && (
          <form onSubmit={handleCreateBarber} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Nome Completo</label>
                <input type="text" required value={newBarberName} onChange={(e) => setNewBarberName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">WhatsApp</label>
                <input type="text" value={newBarberPhone} onChange={(e) => setNewBarberPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none transition" />
              </div>
            </div>
            <div className="flex justify-end border-t border-white/5 pt-5">
              <button disabled={creatingBarber} className="bg-white text-black hover:bg-zinc-200 text-sm font-bold px-8 py-3 rounded-xl transition disabled:opacity-50 flex items-center gap-2">
                {creatingBarber ? 'Processando...' : 'Adicionar Profissional'}
              </button>
            </div>
          </form>
        )}

        {/* LISTAGEM E MÉTRICAS DA EQUIPE */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {team.map(member => {
            const { cutsCount, revenue } = getBarberMetrics(member.id);
            const comRate = commissions[member.id] !== undefined ? commissions[member.id] : 50; 
            const toPay = (revenue * comRate) / 100;

            return (
              <div key={member.id} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                      <UserCircle size={24} className="text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{member.name}</h3>
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">{member.role === 'admin' ? 'Dono / Admin' : 'Profissional'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-1">Atendimentos</p>
                    <p className="text-xl font-bold text-zinc-100">{cutsCount}</p>
                  </div>
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Receita Gerada</p>
                    <p className="text-lg font-bold text-emerald-400">R$ {revenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">A Pagar (Comissão)</p>
                    <p className="text-lg font-bold text-amber-400">R$ {toPay.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center gap-1"><Percent size={14}/> % Comissão:</label>
                  <input 
                    type="number" min="0" max="100" 
                    value={comRate}
                    onChange={(e) => setCommissions({ ...commissions, [member.id]: parseFloat(e.target.value) || 0 })}
                    className="bg-[#121214] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-20 focus:border-amber-500 outline-none text-center"
                  />
                  <span className="text-zinc-500 text-sm">%</span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  );
}