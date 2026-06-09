'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Settings, Image as ImageIcon, ShieldAlert, Clock, Check, Ban } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function SettingsView({ token }: { token: string }) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [companyPlan, setCompanyPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    const fetchCompanyPlan = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/company`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // 🔥 BLINDAGEM DE CÁLCULO 🔥
          // Se o backend esquecer de mandar os dias restantes, o frontend calcula na marra!
          let dias = data.dias_restantes;
          if (dias === undefined || dias === null) {
            const targetDate = data.status === 'trial' ? data.trial_end : data.subscription_end;
            if (targetDate) {
              const diff = new Date(targetDate).getTime() - new Date().getTime();
              dias = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
            } else {
              dias = 0;
            }
          }
          
          setCompanyPlan({ ...data, dias_restantes: dias });
        } else {
          console.warn("Rota /admin/company falhou. Verifique se o endpoint existe no backend.");
        }
      } catch (err) {
        console.error("Erro crítico ao buscar plano", err);
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchCompanyPlan();
  }, [token]);

  const handleLogoUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!logoFile) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', logoFile);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/company/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        alert('Logo atualizada com sucesso!');
        setLogoFile(null);
        setLogoPreview('');
      } else {
        const err = await res.json();
        alert(`Erro: ${err.detail || 'Falha ao atualizar'}`);
      }
    } catch {
      alert('Erro crítico ao subir logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8 max-w-3xl mx-auto">
        
        <div className="mb-8 border-b border-white/5 pb-6">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Settings size={22} className="text-violet-400" /> Configurações da Barbearia
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Personalize a aparência do seu aplicativo para os clientes.</p>
        </div>

        <form onSubmit={handleLogoUpload} className="space-y-8">
          <div>
            <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
              <ImageIcon size={16} className="text-emerald-400"/> Logo da Empresa
            </h3>
            
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-center">
              <div className="w-32 h-32 shrink-0 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center bg-black overflow-hidden relative group">
                {logoPreview ? (
                  <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center p-2">
                    <ImageIcon size={24} className="mx-auto text-zinc-600 mb-2" />
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Sem Logo</p>
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-4">
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setLogoFile(file);
                  if (file) setLogoPreview(URL.createObjectURL(file));
                }} className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-violet-500/10 file:text-violet-400 hover:file:bg-violet-500/20 cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button disabled={uploadingLogo || !logoFile} type="submit" className="bg-violet-600 text-white font-bold px-8 py-3.5 rounded-xl disabled:opacity-50">
              {uploadingLogo ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-white/5 pt-8">
          <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-400" /> Plano & Licença
          </h3>

          {loadingPlan ? (
             <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex items-center justify-center gap-3">
               <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-zinc-500 text-sm font-medium">Buscando dados no servidor de faturamento...</p>
             </div>
          ) : companyPlan ? (
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    companyPlan.status === 'trial' ? 'bg-amber-500/20 text-amber-400' : 
                    companyPlan.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {companyPlan.status === 'trial' ? <Clock size={24} /> : companyPlan.status === 'active' ? <Check size={24} /> : <Ban size={24} />}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">
                      {companyPlan.status === 'trial' ? 'Período de Teste' : companyPlan.status === 'active' ? 'Plano Ativo' : 'Suspenso'}
                    </p>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${
                      companyPlan.status === 'trial' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                      companyPlan.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {companyPlan.status === 'trial' ? `${companyPlan.dias_restantes} dias restantes` : companyPlan.status === 'active' ? 'Assinatura Ativa' : 'Acesso Bloqueado'}
                    </span>
                  </div>
                </div>
                
                <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition text-sm shadow-lg shadow-emerald-500/20">
                  Renovar Assinatura
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#121214] rounded-xl p-4">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Início da Conta</p>
                  <p className="text-sm font-semibold text-zinc-200">
                    {companyPlan.data_cadastro ? new Date(companyPlan.data_cadastro).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
                <div className="bg-[#121214] rounded-xl p-4">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                    {companyPlan.status === 'trial' ? 'Fim do Teste' : 'Vencimento do Plano'}
                  </p>
                  <p className="text-sm font-semibold text-zinc-200">
                    {companyPlan.status === 'trial' && companyPlan.trial_end 
                      ? new Date(companyPlan.trial_end).toLocaleDateString('pt-BR') 
                      : companyPlan.subscription_end 
                      ? new Date(companyPlan.subscription_end).toLocaleDateString('pt-BR') 
                      : '—'}
                  </p>
                </div>
              </div>

              {companyPlan.status === 'trial' && companyPlan.dias_restantes <= 3 && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex justify-between items-center">
                  <p className="text-xs text-amber-300 font-bold">
                    ⚠️ Seu teste acaba em {companyPlan.dias_restantes} dias. Evite o bloqueio do seu sistema!
                  </p>
                </div>
              )}
            </div>
          ) : (
             <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 text-center text-rose-400">
               <p className="text-sm font-bold">Não foi possível recuperar os dados de faturamento.</p>
               <p className="text-xs text-zinc-500 mt-1">Verifique se o seu painel de controle (Super Admin) gerou os dados corretamente.</p>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}