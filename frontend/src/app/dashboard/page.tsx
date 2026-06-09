'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthSession, getAuthToken, getCookieValue } from '@/lib/session';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken() || getCookieValue('access_token');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Assinatura em análise</h1>
        <p className="text-zinc-400 text-sm leading-6">
          Sua barbearia foi redirecionada para a página base do dashboard.
          Verifique a assinatura, efetue o checkout ou ative manualmente para voltar ao painel administrativo.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
          >
            Ir para login
          </button>
          <button
            onClick={() => {
              clearAuthSession();
              router.push('/login');
            }}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-semibold"
          >
            Limpar sessão
          </button>
        </div>
      </div>
    </div>
  );
}

