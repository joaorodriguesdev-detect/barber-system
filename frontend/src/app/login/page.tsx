'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { clearAuthSession, getAuthToken, setAuthSession } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAuthToken()) {
      router.push('/admin');
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Impede a página de recarregar
    setError(null);
    setLoading(true);

    try {
      const apiUrl = API_BASE_URL ? `${API_BASE_URL}/auth/login` : "http://localhost:8000/auth/login";
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Usuário ou senha incorretos.');
        setLoading(false);
        return;
      }

                              const tenantStatus = data.user?.tenant_status || data.tenant_status || 'active';
                  setAuthSession(data.access_token, data.token_type, data.user, tenantStatus);

                                                      if (tenantStatus === 'suspended') {
                    router.push('/dashboard');
                    return;
                  }

      setLoading(false);
      router.push('/admin');
    } catch (err) {
      console.error(err);
      setError('Erro de conexão! O backend está rodando no localhost:8000?');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
      {/* Fundo sutil para não bloquear cliques */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-unifraktur text-amber-400">Flux Barber</h2>
          <p className="text-sm text-zinc-500 mt-2">Painel Administrativo Restrito</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Usuário</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#121214] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121214] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Processando...' : 'ENTRAR NO SISTEMA'}
          </button>
          <button
            type="button"
            onClick={() => {
              clearAuthSession();
              router.push('/login');
            }}
            className="w-full py-3.5 mt-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold rounded-xl transition-all"
          >
            Limpar sessão local
          </button>
        </form>
      </div>
    </div>
  );
}