'use client';

import { useEffect, useState, FormEvent } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api';
import { clearAuthSession, getAuthToken } from '@/lib/session';
import {
  Building2, Plus, Search, ShieldAlert, X, 
  Activity, Link as LinkIcon, UserCircle, Mail, Lock, Trash2
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  subdomain: string;
  logo_url: string | null;
  is_active?: boolean; 
  created_at?: string;
  status?: 'trial' | 'active' | 'suspended';
  trial_end?: string | null;
  subscription_end?: string | null;
}

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Estados do Modal
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Campos do Formulário
  const [newName, setNewName] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [trialDays, setTrialDays] = useState<7 | 15 | 30>(7);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/system/companies`, {
        headers: token ? { Authorization: `Bearer ${token}`, 'x-security-token': token } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao buscar empresas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAuthToken()) {
      clearAuthSession();
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchCompanies();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewName(val);
    setNewSubdomain(val.toLowerCase().replace(/[^a-z0-9]/g, ''));
  };

  const handleCreateCompany = async (e: FormEvent) => {
    e.preventDefault();

    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/system/provision-tenant`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-master-token': 'flux-master-2026'
        },
        body: JSON.stringify({ 
          company_name: newName, 
          subdomain: newSubdomain,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
          trial_days: trialDays,
        }),
      });

      if (res.ok) {
        alert('Empresa e Administrador criados com sucesso!');
        setShowModal(false);
        setNewName(''); setNewSubdomain('');
        setAdminName(''); setAdminEmail(''); setAdminPassword('');
        fetchCompanies(); 
      } else {
        const err = await res.json();
        const errorMessage = typeof err.detail === 'string'
          ? err.detail
          : JSON.stringify(err.detail || err);
        alert(`Erro: ${errorMessage}`);
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    } finally {
      setCreating(false);
    }
  };

  const handleCheckout = async (companyId: number, kind: 'trial' | 'subscription') => {
    setCheckoutLoadingId(companyId);
    try {
      const res = await fetch(`${API_BASE_URL}/billing/checkout-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, kind }),
      });
      const data = await res.json();
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      if (res.status === 404 && data.detail) {
        const fallbackUrl = kind === 'trial' ? data.detail.trial_url : data.detail.subscription_url;
        if (fallbackUrl) {
          window.location.href = fallbackUrl;
          return;
        }
      }
      alert(data.detail?.trial_url || data.detail?.subscription_url || data.detail || 'Falha ao gerar checkout.');
    } finally {
      setCheckoutLoadingId(null);
    }
  };

  const handleManualActivate = async (company: Company) => {
    const customerId = prompt(`ID do cliente Asaas para ${company.name}`);
    if (!customerId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/billing/manual/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, status: 'active', code: 'ionbarber-active-2026' }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompanies((prev) => prev.map((item) => (item.id === company.id ? { ...item, status: 'active' } : item)));
        alert(data.message || 'Empresa ativada.');
      } else {
        alert(data.detail || 'Erro ao ativar manualmente.');
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    }
  };

  // 🔥 LIBERADO O 30 AQUI NA TIPAGEM E NA CHAMADA 🔥
  const handleCompanyAction = async (companyId: number, action: 'suspend' | 'trial', days?: 7 | 15 | 30) => {
    setActionLoadingId(companyId);
    try {
      const res = await fetch(`${API_BASE_URL}/billing/companies/${companyId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'ionbarber-active-2026', days }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = data.company;
        setCompanies((prev) => prev.map((item) => (item.id === companyId ? { ...item, ...updated } : item)));
        alert(data.message || 'Ação aplicada com sucesso.');
      } else {
        alert(data.detail || 'Erro ao executar ação.');
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteCompany = async (companyId: number, companyName: string) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE a empresa "${companyName}"?\n\nEsta ação é IRREVERSÍVEL!`)) return;

    setDeletingId(companyId);
    try {
      const res = await fetch(`${API_BASE_URL}/system/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'x-master-token': 'flux-master-2026' },
      });

      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== companyId));
        alert(`Empresa "${companyName}" excluída permanentemente.`);
      } else {
        const err = await res.json();
        const errorMessage = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || err);
        alert(`Erro: ${errorMessage}`);
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <header className="bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/[0.04] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Master Panel</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">SaaS Control Center</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => { clearAuthSession(); window.location.href = '/login'; }} className="text-xs font-bold text-rose-400 hover:text-rose-300 transition">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 size={24} className="text-emerald-400" /> 
              Gestão de Clientes (Tenants)
            </h2>
            <p className="text-zinc-400 text-sm mt-1">Gerencie todas as barbearias que utilizam o seu sistema.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="text" placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-[#121214] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-full md:w-64 transition" />
            </div>
            <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-500/20">
              <Plus size={18} /> Nova Empresa
            </button>
          </div>
        </div>

        <div className="bg-[#121214] border border-white/[0.05] rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0A0A0A] text-zinc-400 text-xs uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-5 font-bold">ID</th>
                  <th className="px-6 py-5 font-bold">Empresa</th>
                  <th className="px-6 py-5 font-bold">Subdomínio (Link)</th>
                  <th className="px-6 py-5 font-bold">Status / Trial</th>
                  <th className="px-6 py-5 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-zinc-500"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>Buscando clientes...</td></tr>
                ) : filteredCompanies.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-zinc-500">Nenhuma empresa encontrada.</td></tr>
                ) : (
                  filteredCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4 font-mono text-zinc-500">#{company.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                            {company.logo_url ? <Image src={company.logo_url} alt="Logo" width={40} height={40} unoptimized className="w-full h-full object-cover" /> : <Building2 size={16} className="text-zinc-500" />}
                          </div>
                          <span className="font-bold text-zinc-100">{company.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`http://${company.subdomain}.lvh.me:3000`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition">
                          <LinkIcon size={14} /> {company.subdomain}.lvh.me
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`w-fit text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${company.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : company.status === 'trial' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {company.status || 'trial'}
                          </span>
                          <span className="text-[11px] text-zinc-500">Trial: {formatDate(company.trial_end)}</span>
                          <span className="text-[11px] text-zinc-500">Plano: {formatDate(company.subscription_end)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button onClick={() => handleCheckout(company.id, company.status === 'trial' ? 'trial' : 'subscription')} disabled={checkoutLoadingId === company.id || actionLoadingId === company.id} className="text-emerald-400 hover:text-emerald-300 transition text-xs font-bold">Checkout</button>
                        <button onClick={() => handleManualActivate(company)} className="text-blue-400 hover:text-blue-300 transition text-xs font-bold">Ativar manual</button>
                        
                        <div className="h-4 w-px bg-white/10 mx-2"></div>
                        
                        <button onClick={() => handleCompanyAction(company.id, 'trial', 7)} disabled={actionLoadingId === company.id} className="text-amber-400 hover:text-amber-300 transition text-xs font-bold">Trial 7d</button>
                        <button onClick={() => handleCompanyAction(company.id, 'trial', 15)} disabled={actionLoadingId === company.id} className="text-yellow-400 hover:text-yellow-300 transition text-xs font-bold">Trial 15d</button>
                        
                        {/* 🔥 BOTÃO DE RENOVAÇÃO DO PLANO MENSAL (30 DIAS) 🔥 */}
                        <button onClick={() => handleCompanyAction(company.id, 'trial', 30)} disabled={actionLoadingId === company.id} className="text-emerald-400 hover:text-emerald-300 transition text-xs font-bold px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 shadow-sm">
                          + Plano 30d
                        </button>
                        
                        <div className="h-4 w-px bg-white/10 mx-2"></div>

                        <button onClick={() => handleCompanyAction(company.id, 'suspend')} disabled={actionLoadingId === company.id} className="text-rose-400 hover:text-rose-300 transition text-xs font-bold">Suspender</button>
                        <button onClick={() => handleDeleteCompany(company.id, company.name)} disabled={deletingId === company.id || actionLoadingId === company.id} className="text-zinc-500 hover:text-rose-400 transition disabled:opacity-30 disabled:cursor-not-allowed ml-2" title="Excluir Empresa Permanentemente">
                          {deletingId === company.id ? <span className="inline-block w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></span> : <Trash2 size={18} />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL MANTIDO IGUAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121214] border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0A0A0A] shrink-0">
              <h2 className="text-white text-lg font-bold flex items-center gap-2"><Plus size={18} className="text-emerald-400" /> Provisionar Novo Cliente</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateCompany} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* CÓDIGO DO FORMULÁRIO (MANTIDO IDÊNTICO PARA ECONOMIZAR ESPAÇO) */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-300 border-b border-white/5 pb-2">1. Dados da Barbearia</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Nome Comercial</label>
                    <input type="text" required value={newName} onChange={handleNameChange} placeholder="Ex: Barbearia Vip" className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Link de Acesso</label>
                    <div className="flex items-center">
                      <input type="text" required value={newSubdomain} onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} placeholder="barbeariavip" className="w-full bg-[#0A0A0A] border border-white/10 border-r-0 rounded-l-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition" />
                      <span className="bg-[#1A1A1C] border border-white/10 border-l-0 rounded-r-xl px-4 py-3 text-sm text-zinc-500 font-mono">.lvh.me</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">3. Plano de Teste (Trial)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {([7, 15, 30] as const).map((days) => (
                      <button key={days} type="button" onClick={() => setTrialDays(days)} className={`relative px-4 py-4 rounded-xl border-2 text-center transition-all ${trialDays === days ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 bg-[#0A0A0A] text-zinc-400 hover:border-zinc-700'}`}>
                        <span className="block text-2xl font-bold">{days}</span><span className="block text-[10px] uppercase tracking-wider mt-1">Dias</span>
                        {trialDays === days && <span className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg></span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-300 border-b border-white/5 pb-2">2. Conta do Proprietário (Admin)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><UserCircle size={14}/> Nome do Dono</label>
                    <input type="text" required value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Nome completo" className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Mail size={14}/> Email (Login)</label>
                      <input type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="dono@barbearia.com" className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Lock size={14}/> Senha de Acesso</label>
                      <input type="password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="******" className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition text-sm">Cancelar</button>
                <button type="submit" disabled={creating} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">{creating ? 'Processando e Criando...' : 'Criar Barbearia & Administrador'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}