'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, X, TrendingUp, Clock, AlertCircle,
  Scissors, LogOut, Check, Ban, Star,
  LayoutDashboard, CalendarCheck, MessageSquare,
  Menu, Trash2, BarChart, Medal, Hash,
  Phone, User
} from 'lucide-react';

interface TopService {
  name: string;
  price: number;
  count: number;
}

interface DashboardMetrics {
  period: { start_date: string; end_date: string };
  total_appointments: number;
  completed_appointments: number;
  canceled_appointments: number;
  pending_appointments: number;
  revenue: number;
  total_barbers: number;
  total_attendances: number;
  top_services: TopService[];
}

interface AppointmentItem {
  id: number;
  customer_id: number;
  barber_id: number;
  service_id: number;
  appointment_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

// Tipos para as abas
type Tab = 'dashboard' | 'agendamentos' | 'postagens' | 'avaliacoes' | 'atendimentos';

const TAB_LABEL: Record<Tab, string> = {
  dashboard: 'Dashboard',
  agendamentos: 'Agendamentos',
  postagens: 'Postagens',
  avaliacoes: 'Avaliações',
  atendimentos: 'Atendimentos',
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

    // Estado do post
  const [showPostForm, setShowPostForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  // Estado dos posts do feed para gerenciar
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

    // Estado dos agendamentos pendentes
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentItem[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
    const [processingId, setProcessingId] = useState<number | null>(null);
    // Sidebar mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Adicionar após os outros estados (ex: após processingId)
    const [pendingReviews, setPendingReviews] = useState<any[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [processingReviewId, setProcessingReviewId] = useState<number | null>(null);
    const [pendingReviewCount, setPendingReviewCount] = useState(0);

    // Estado para todas as avaliações
    const [allReviews, setAllReviews] = useState<any[]>([]);
    const [loadingAllReviews, setLoadingAllReviews] = useState(false);

    // Estado para todos os agendamentos (tab)
    const [allAppointments, setAllAppointments] = useState<AppointmentItem[]>([]);
    const [loadingAllAppointments, setLoadingAllAppointments] = useState(false);
    const [appointmentFilter, setAppointmentFilter] = useState<'todos' | 'mes'>('mes');
    const [selectedMonth, setSelectedMonth] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Estado para atendimentos (completados)
    const [completedAppointments, setCompletedAppointments] = useState<AppointmentItem[]>([]);
    const [loadingCompleted, setLoadingCompleted] = useState(false);

    // Estado para serviços (mapeamento)
      const [servicesMap, setServicesMap] = useState<Record<number, { name: string; price: number }>>({});

      // Estado para avaliações de POSTS pendentes
      const [pendingPostReviews, setPendingPostReviews] = useState<any[]>([]);
      const [showPostReviewModal, setShowPostReviewModal] = useState(false);
      const [loadingPostReviews, setLoadingPostReviews] = useState(false);
      const [processingPostReviewId, setProcessingPostReviewId] = useState<number | null>(null);
      const [pendingPostReviewCount, setPendingPostReviewCount] = useState(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    const fetchDashboard = async () => {
    try {
      const response = await fetch('http://192.168.1.1:8000/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setMetrics(data);
      setPendingReviewCount(data.pending_reviews || 0);
    } catch {
      // Silencia erro
    } finally {
      setLoading(false);
    }
  };

    // Fetch de todos os agendamentos
  const fetchAllAppointments = async () => {
    setLoadingAllAppointments(true);
    try {
      const res = await fetch('http://192.168.1.1:8000/appointments?barber_id=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllAppointments(data || []);
      }
    } catch {}
    finally { setLoadingAllAppointments(false); }
  };

  // Fetch de atendimentos (completados)
  const fetchCompletedAppointments = async () => {
    setLoadingCompleted(true);
    try {
      const res = await fetch('http://192.168.1.1:8000/appointments?barber_id=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedAppointments((data || []).filter((a: AppointmentItem) => a.status === 'completed'));
      }
    } catch {}
    finally { setLoadingCompleted(false); }
  };

  // Fetch de todas as avaliações
  const fetchAllReviews = async () => {
    setLoadingAllReviews(true);
    try {
      const res = await fetch('http://192.168.1.1:8000/reviews/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAllReviews(await res.json());
    } catch {}
    finally { setLoadingAllReviews(false); }
  };

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) setUserName(JSON.parse(userData).name || 'Admin');

        fetchDashboard();
    fetchFeedPosts();
    fetchServicesMap();
    fetchPendingPostReviewCount();
  }, [router]);

  useEffect(() => {
    // Carrega dados da aba ativa
    if (activeTab === 'agendamentos') fetchAllAppointments();
    if (activeTab === 'atendimentos') fetchCompletedAppointments();
    if (activeTab === 'avaliacoes') fetchAllReviews();
  }, [activeTab]);

    // Buscar mapa de serviços
  const fetchServicesMap = async () => {
    try {
      const res = await fetch('http://192.168.1.1:8000/services/');
      if (res.ok) {
        const data = await res.json();
        const map: Record<number, { name: string; price: number }> = {};
        (data || []).forEach((s: any) => { map[s.id] = { name: s.name, price: s.price }; });
        setServicesMap(map);
      }
    } catch {}
  };

  const fetchFeedPosts = async () => {
    setLoadingFeed(true);
    try {
      const res = await fetch('http://192.168.1.1:8000/feed/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFeedPosts(data);
      }
    } catch {
      // silencia
    } finally {
      setLoadingFeed(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Tem certeza que deseja apagar este post?')) return;
    setDeletingPostId(postId);
    try {
      const res = await fetch(`http://192.168.1.1:8000/feed/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedPosts((prev) => prev.filter((p: any) => p.id !== postId));
      } else {
        alert('Erro ao deletar post');
      }
    } catch {
      alert('Erro de conexão ao deletar post');
    } finally {
      setDeletingPostId(null);
    }
  };

    const fetchPendingAppointments = async () => {
    setLoadingPending(true);
    try {
      const response = await fetch('http://192.168.1.1:8000/appointments?barber_id=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const all = await response.json();
      // Filtra apenas os pendentes
      setPendingAppointments(all.filter((a: AppointmentItem) => a.status === 'pending'));
    } catch {
      setPendingAppointments([]);
    } finally {
      setLoadingPending(false);
    }
  };

    const handleOpenModal = () => {
    fetchPendingAppointments();
    setShowPendingModal(true);
  };

  const handleChangeStatus = async (appointmentId: number, newStatus: 'completed' | 'canceled') => {
    setProcessingId(appointmentId);
    try {
      const response = await fetch(`http://192.168.1.1:8000/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error();

      // Remove da lista local
      setPendingAppointments((prev) => prev.filter((a) => a.id !== appointmentId));

      // Atualiza dashboard
      await fetchDashboard();
    } catch {
      alert('Erro ao atualizar status');
    } finally {
      setProcessingId(null);
    }
  };

    const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  // --- Funções de Avaliações ---
  const fetchPendingReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch('http://192.168.1.1:8000/reviews/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPendingReviews(await res.json());
    } catch {
      setPendingReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleOpenReviewModal = () => {
    fetchPendingReviews();
    setShowReviewModal(true);
  };

  // --- Funções de Avaliações de POSTS ---
  const fetchPendingPostReviews = async () => {
  setLoadingPostReviews(true);
  try {
    const res = await fetch('http://192.168.1.1:8000/post-reviews/pending', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setPendingPostReviews(await res.json());
  } catch {
    setPendingPostReviews([]);
  } finally {
    setLoadingPostReviews(false);
  }
  };

  const fetchPendingPostReviewCount = async () => {
  try {
    const res = await fetch('http://192.168.1.1:8000/post-reviews/pending/count', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setPendingPostReviewCount(data.count || 0);
    }
  } catch {}
  };

  const handleOpenPostReviewModal = () => {
  fetchPendingPostReviews();
  setShowPostReviewModal(true);
  };

  const handleApprovePostReview = async (reviewId: number) => {
  setProcessingPostReviewId(reviewId);
  try {
    const res = await fetch(`http://192.168.1.1:8000/post-reviews/${reviewId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setPendingPostReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setPendingPostReviewCount((prev) => Math.max(0, prev - 1));
    }
  } catch {
    alert('Erro ao aprovar avaliação de post');
  } finally {
    setProcessingPostReviewId(null);
  }
  };

  const handleRejectPostReview = async (reviewId: number) => {
  setProcessingPostReviewId(reviewId);
  try {
    const res = await fetch(`http://192.168.1.1:8000/post-reviews/${reviewId}/reject`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setPendingPostReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setPendingPostReviewCount((prev) => Math.max(0, prev - 1));
    }
  } catch {
    alert('Erro ao rejeitar avaliação de post');
  } finally {
    setProcessingPostReviewId(null);
  }
  };

  const handleApproveReview = async (reviewId: number) => {
    setProcessingReviewId(reviewId);
    try {
      const res = await fetch(`http://192.168.1.1:8000/reviews/${reviewId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPendingReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setPendingReviewCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      alert('Erro ao aprovar avaliação');
    } finally {
      setProcessingReviewId(null);
    }
  };

  const handleRejectReview = async (reviewId: number) => {
    setProcessingReviewId(reviewId);
    try {
      const res = await fetch(`http://192.168.1.1:8000/reviews/${reviewId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPendingReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setPendingReviewCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      alert('Erro ao rejeitar avaliação');
    } finally {
      setProcessingReviewId(null);
    }
  };

    const handlePostSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      alert('Selecione uma imagem para publicar.');
      return;
    }
    setPosting(true);
    const userData = JSON.parse(localStorage.getItem('user') || '{}');

    const formData = new FormData();
    formData.append('barber_id', String(userData.id));
    formData.append('image', imageFile);
    formData.append('caption', caption);

    try {
      const res = await fetch('http://192.168.1.1:8000/feed/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Erro ao publicar');
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    }

    setPosting(false);
    setShowPostForm(false);
    setImageFile(null);
    setImagePreview('');
    setCaption('');
  };

  if (loading || !metrics) return (
    <div className="min-h-screen bg-[#ecf0f5] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <div className="inline-block w-8 h-8 border-4 border-[#3c8dbc] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Carregando dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#ecf0f5] flex">
      
            {/* ===== OVERLAY MOBILE ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== SIDEBAR (#222d32) ===== */}
      <aside className={`
        w-60 bg-[#222d32] text-gray-300 fixed inset-y-0 left-0 z-50 flex flex-col shadow-lg
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:z-30
      `}>
        
        {/* LOGO */}
        <div className="bg-[#1a2226] px-5 py-4 border-b border-[#2c3b41] flex items-center justify-between">
          <div>
            <h1 className="text-white text-lg font-bold tracking-wide">
              <span className="text-[#3c8dbc]">●</span> Barbearia
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Painel Administrativo</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white transition p-1"
          >
            <X size={18} />
          </button>
        </div>

                {/* NAVEGAÇÃO */}
        <nav className="flex-1 py-3 sidebar-scroll overflow-y-auto">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest px-5 mb-2 mt-1">Navegação</p>
          
          {(['dashboard', 'agendamentos', 'postagens', 'avaliacoes', 'atendimentos'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition text-left
                ${activeTab === tab
                  ? 'text-white bg-[#1a2226] border-l-[3px] border-[#3c8dbc] font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-[#2c3b41]'
                }`}
            >
              {tab === 'dashboard' && <LayoutDashboard size={16} />}
              {tab === 'agendamentos' && <CalendarCheck size={16} />}
              {tab === 'postagens' && <MessageSquare size={16} />}
              {tab === 'avaliacoes' && <Star size={16} />}
              {tab === 'atendimentos' && <BarChart size={16} />}
              {TAB_LABEL[tab]}
            </button>
          ))}
        </nav>

        {/* FOOTER DO SIDEBAR - LOGOUT */}
        <div className="border-t border-[#2c3b41] p-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-[#2c3b41] rounded transition"
          >
            <LogOut size={16} />
            Sair do sistema
          </button>
        </div>
      </aside>

      {/* ===== ÁREA PRINCIPAL (ao lado da sidebar) ===== */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        
        {/* ===== TOP BAR (#3c8dbc) ===== */}
        <header className="bg-[#3c8dbc] text-white shadow-md">
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            
                        {/* Esquerda: menu mobile + saudação */}
            <div className="flex items-center gap-3">
              {/* Hamburger menu - mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 bg-white/15 hover:bg-white/25 rounded transition"
              >
                <Menu size={18} />
              </button>
              <h2 className="text-base md:text-lg font-semibold">Dashboard</h2>
            </div>

            {/* Direita: ações */}
            <div className="flex items-center gap-2">
              {/* Nome do usuário */}
              <span className="text-sm text-white/80 hidden md:inline-block mr-2">
                <span className="font-medium">{userName}</span>
              </span>

              {/* Botão Pendentes */}
              <button
                onClick={handleOpenModal}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded transition"
              >
                <Clock size={14} />
                <span className="hidden sm:inline">Pendentes</span>
                <span className="bg-amber-400 text-[#222d32] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{metrics.pending_appointments}</span>
              </button>

                            {/* Botão Avaliações */}
              <button
                onClick={handleOpenReviewModal}
                className="relative flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded transition"
              >
                <Star size={14} />
                <span className="hidden sm:inline">Avaliações</span>
                {pendingReviewCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center absolute -top-1.5 -right-1.5">
                    {pendingReviewCount}
                  </span>
                )}
              </button>

              {/* Botão Avaliações de Posts */}
              <button
                onClick={handleOpenPostReviewModal}
                className="relative flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded transition"
              >
                <Star size={14} />
                <span className="hidden lg:inline">Aval. Posts</span>
                {pendingPostReviewCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center absolute -top-1.5 -right-1.5">
                    {pendingPostReviewCount}
                  </span>
                )}
              </button>

              {/* Botão Novo Post */}
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded transition"
              >
                {showPostForm ? <X size={14} /> : <Plus size={14} />}
                <span className="hidden sm:inline">{showPostForm ? 'Fechar' : 'Novo Post'}</span>
              </button>

              {/* Logout (mobile) */}
              <button
                onClick={handleLogout}
                className="md:hidden flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded transition"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* ===== CONTEÚDO ===== */}
        <main className="flex-1 p-4 md:p-6">

                    {/* Breadcrumb */}
          <div className="text-xs text-gray-500 mb-4">
            <span className="text-gray-400">Home</span>
            <span className="mx-1.5">/</span>
            <span className="text-gray-600 font-medium">{TAB_LABEL[activeTab]}</span>
            <span className="ml-3 text-gray-400">|</span>
            <span className="ml-3 text-gray-400">Bem-vindo(a), <span className="text-gray-600 font-medium">{userName}</span></span>
          </div>

                    {/* ==================== DASHBOARD ==================== */}
                    {activeTab === 'dashboard' && (
                      <>

          {/* ===== CARDS DE MÉTRICAS (blocos sólidos coloridos) ===== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Card Cortes (Azul #3c8dbc) */}
            <div className="bg-[#3c8dbc] rounded-sm shadow-sm overflow-hidden">
              <div className="p-4 text-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/80 text-xs uppercase font-bold tracking-wider">Cortes</p>
                  <Scissors size={24} className="text-white/40" />
                </div>
                <p className="text-3xl font-bold">{metrics.completed_appointments}</p>
              </div>
              <div className="bg-white/15 px-4 py-2">
                <p className="text-xs text-white/70">
                  <TrendingUp size={12} className="inline mr-1" />
                  Total de cortes realizados
                </p>
              </div>
            </div>

            {/* Card Faturamento (Verde #00a65a) */}
            <div className="bg-[#00a65a] rounded-sm shadow-sm overflow-hidden">
              <div className="p-4 text-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/80 text-xs uppercase font-bold tracking-wider">Faturamento</p>
                  <TrendingUp size={24} className="text-white/40" />
                </div>
                <p className="text-3xl font-bold">R$ {metrics.revenue.toFixed(2)}</p>
              </div>
              <div className="bg-white/15 px-4 py-2">
                <p className="text-xs text-white/70">
                  <TrendingUp size={12} className="inline mr-1" />
                  Receita total do período
                </p>
              </div>
            </div>

            {/* Card Pendentes (Amarelo #f39c12) */}
            <div className="bg-[#f39c12] rounded-sm shadow-sm overflow-hidden">
              <div className="p-4 text-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/80 text-xs uppercase font-bold tracking-wider">Pendentes</p>
                  <Clock size={24} className="text-white/40" />
                </div>
                <p className="text-3xl font-bold">{metrics.pending_appointments}</p>
              </div>
              <div className="bg-white/15 px-4 py-2">
                <p className="text-xs text-white/70">
                  <AlertCircle size={12} className="inline mr-1" />
                  Aguardando confirmação
                </p>
              </div>
            </div>

            {/* Card Cancelados (Vermelho #dd4b39) */}
            <div className="bg-[#dd4b39] rounded-sm shadow-sm overflow-hidden">
              <div className="p-4 text-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/80 text-xs uppercase font-bold tracking-wider">Cancelados</p>
                  <AlertCircle size={24} className="text-white/40" />
                </div>
                <p className="text-3xl font-bold">{metrics.canceled_appointments}</p>
              </div>
              <div className="bg-white/15 px-4 py-2">
                <p className="text-xs text-white/70">
                  <Ban size={12} className="inline mr-1" />
                  Total de cancelamentos
                </p>
              </div>
            </div>
          </div>

                    {/* Informações adicionais */}
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-5 mb-6">
            <h3 className="text-gray-700 text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#3c8dbc] rounded"></div>
              Resumo do Período
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 rounded p-3 border border-gray-100">
                <p className="text-gray-500 text-xs uppercase font-semibold">Total Agendamentos</p>
                <p className="text-gray-800 text-xl font-bold mt-1">{metrics.total_appointments}</p>
              </div>
              <div className="bg-gray-50 rounded p-3 border border-gray-100">
                <p className="text-gray-500 text-xs uppercase font-semibold">Barbeiros</p>
                <p className="text-gray-800 text-xl font-bold mt-1">{metrics.total_barbers}</p>
              </div>
              <div className="bg-gray-50 rounded p-3 border border-gray-100">
                <p className="text-gray-500 text-xs uppercase font-semibold">Atendimentos</p>
                <p className="text-gray-800 text-xl font-bold mt-1">{metrics.total_attendances}</p>
              </div>
              <div className="bg-gray-50 rounded p-3 border border-gray-100">
                <p className="text-gray-500 text-xs uppercase font-semibold">Período</p>
                <p className="text-gray-800 text-sm font-bold mt-1">
                  {new Date(metrics.period.start_date).toLocaleDateString('pt-BR')} - {new Date(metrics.period.end_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* ===== SERVIÇOS MAIS PEDIDOS ===== */}
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-5 mb-6">
            <h3 className="text-gray-700 text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#3c8dbc] rounded"></div>
              <Medal size={16} className="text-[#f39c12]" />
              Mais Pedidos
            </h3>
            {metrics.top_services && metrics.top_services.length > 0 ? (
              <div className="space-y-2">
                {metrics.top_services.map((svc: TopService, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                        ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${idx === 1 ? 'bg-gray-200 text-gray-600' : ''}
                        ${idx === 2 ? 'bg-orange-100 text-orange-700' : ''}
                        ${idx >= 3 ? 'bg-blue-50 text-blue-600' : ''}
                      `}>
                        {idx + 1}º
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{svc.name}</p>
                        <p className="text-xs text-gray-400">R$ {svc.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-gray-400" />
                      <span className="text-lg font-bold text-[#3c8dbc]">{svc.count}</span>
                      <span className="text-xs text-gray-400">pedidos</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-4 text-sm">Nenhum serviço solicitado ainda.</p>
            )}
          </div>

                    {/* Footer institucional */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Barbearia System — Painel Administrativo v1.0
          </div>

            </>
          )}

          {/* ==================== AGENDAMENTOS ==================== */}
          {activeTab === 'agendamentos' && (
            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-700 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#3c8dbc] rounded"></div>
                  Todos os Agendamentos
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAppointmentFilter('mes')}
                    className={`text-xs px-3 py-1.5 rounded font-medium transition ${
                      appointmentFilter === 'mes' ? 'bg-[#3c8dbc] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Este Mês
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('todos')}
                    className={`text-xs px-3 py-1.5 rounded font-medium transition ${
                      appointmentFilter === 'todos' ? 'bg-[#3c8dbc] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                </div>
              </div>

              {loadingAllAppointments ? (
                <p className="text-center text-gray-400 py-6">Carregando agendamentos...</p>
              ) : allAppointments.length === 0 ? (
                <p className="text-center text-gray-400 py-6">Nenhum agendamento encontrado.</p>
              ) : (
                <>
                  {/* Filtro por mês */}
                  {appointmentFilter === 'mes' && (
                    <div className="mb-4">
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700"
                      />
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left px-3 py-3 text-gray-500 text-xs uppercase font-semibold">Cliente</th>
                          <th className="text-left px-3 py-3 text-gray-500 text-xs uppercase font-semibold">Serviço</th>
                          <th className="text-left px-3 py-3 text-gray-500 text-xs uppercase font-semibold">Data</th>
                          <th className="text-left px-3 py-3 text-gray-500 text-xs uppercase font-semibold">Hora</th>
                          <th className="text-left px-3 py-3 text-gray-500 text-xs uppercase font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
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
                              <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-3">
                                  <span className="font-medium text-gray-800">{nome}</span>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="text-gray-600">{servicesMap[app.service_id]?.name || `#${app.service_id}`}</span>
                                </td>
                                <td className="px-3 py-3 text-gray-600">{dataObj.toLocaleDateString('pt-BR')}</td>
                                <td className="px-3 py-3 text-gray-600">{dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="px-3 py-3">
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                                    app.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {app.status === 'completed' ? 'Concluído' :
                                     app.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                  </span>
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
          )}

          {/* ==================== POSTAGENS ==================== */}
          {activeTab === 'postagens' && (
            <>
              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-gray-700 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <div className="w-1 h-4 bg-[#3c8dbc] rounded"></div>
                    Gerenciar Postagens
                  </h2>
                  <button
                    onClick={() => setShowPostForm(!showPostForm)}
                    className="flex items-center gap-1.5 bg-[#3c8dbc] hover:bg-[#337ab7] text-white text-xs font-medium px-3 py-2 rounded transition"
                  >
                    {showPostForm ? <X size={14} /> : <Plus size={14} />}
                    {showPostForm ? 'Fechar' : 'Nova Postagem'}
                  </button>
                </div>

                {showPostForm && (
                  <form onSubmit={handlePostSubmit} className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs text-gray-500 font-semibold uppercase mb-1.5">Selecionar Foto</label>
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setImageFile(file);
                        if (file) setImagePreview(URL.createObjectURL(file));
                        else setImagePreview('');
                      }} className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#3c8dbc] file:text-white hover:file:bg-[#337ab7] cursor-pointer" />
                    </div>
                    {imagePreview && (
                      <div className="rounded overflow-hidden border border-gray-200 bg-gray-50 max-h-48 flex items-center justify-center">
                        <img src={imagePreview} alt="Preview" className="max-h-48 object-contain" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-500 font-semibold uppercase mb-1.5">Legenda</label>
                      <input type="text" placeholder="Descreva o corte..." value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="border border-gray-300 rounded p-2.5 text-sm text-gray-700 w-full focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc]/30 outline-none transition" />
                    </div>
                    <div className="flex justify-end">
                      <button disabled={posting}
                        className="bg-[#3c8dbc] hover:bg-[#337ab7] text-white text-sm font-bold px-6 py-2.5 rounded transition disabled:opacity-50 flex items-center gap-2">
                        {posting ? (
                          <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Publicando...</>
                        ) : 'Publicar Agora'}
                      </button>
                    </div>
                  </form>
                )}

                {loadingFeed ? (
                  <p className="text-center text-gray-400 py-4">Carregando posts...</p>
                ) : feedPosts.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">Nenhum post publicado ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feedPosts.map((post: any) => (
                      <div key={post.id} className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 p-3">
                        <img src={post.image_url} alt="Post" className="w-14 h-14 sm:w-16 sm:h-16 rounded-md object-cover bg-gray-200 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-gray-700 truncate">{post.caption || 'Sem legenda'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(post.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <button onClick={() => handleDeletePost(post.id)} disabled={deletingPostId === post.id}
                          className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded transition disabled:opacity-50 shrink-0">
                          <Trash2 size={12} className="sm:size-[14]" />
                          <span className="hidden sm:inline">{deletingPostId === post.id ? '...' : 'Apagar'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ==================== AVALIAÇÕES ==================== */}
          {activeTab === 'avaliacoes' && (
            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-5">
              <h2 className="text-gray-700 text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#3c8dbc] rounded"></div>
                Todas as Avaliações
              </h2>

              {loadingAllReviews ? (
                <p className="text-center text-gray-400 py-6">Carregando avaliações...</p>
              ) : allReviews.length === 0 ? (
                <p className="text-center text-gray-400 py-6">Nenhuma avaliação encontrada.</p>
              ) : (
                <div className="space-y-3">
                  {allReviews.map((review) => (
                    <div key={review.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{review.customer_name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            review.status === 'approved' ? 'bg-green-100 text-green-700' :
                            review.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {review.status === 'approved' ? 'Aprovada' :
                             review.status === 'pending' ? 'Pendente' : 'Rejeitada'}
                          </span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={13}
                              className={star <= review.rating ? 'text-[#f39c12]' : 'text-gray-300'}
                              fill={star <= review.rating ? 'currentColor' : 'none'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(review.created_at).toLocaleDateString('pt-BR')} às {new Date(review.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== ATENDIMENTOS ==================== */}
          {activeTab === 'atendimentos' && (
            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-5">
              <h2 className="text-gray-700 text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#3c8dbc] rounded"></div>
                Atendimentos Realizados
              </h2>

              {loadingCompleted ? (
                <p className="text-center text-gray-400 py-6">Carregando atendimentos...</p>
              ) : completedAppointments.length === 0 ? (
                <p className="text-center text-gray-400 py-6">Nenhum atendimento realizado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {completedAppointments.map((app) => {
                    const notes = app.notes || '';
                    const nomeMatch = notes.match(/Cliente:\s*(.*?)(?:\s*-\s*Tel:|$)/);
                    const telMatch = notes.match(/Tel:\s*(.*?)$/);
                    const nome = nomeMatch ? nomeMatch[1].trim() : `Cliente #${app.customer_id}`;
                    const tel = telMatch ? telMatch[1].trim() : '—';
                    const dataObj = new Date(app.appointment_date);
                    const svc = servicesMap[app.service_id];

                    return (
                      <div key={app.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#00a65a]/20 flex items-center justify-center">
                              <User size={15} className="text-[#00a65a]" />
                            </div>
                            <div>
                              <p className="text-gray-800 font-semibold text-sm">{nome}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone size={10} />
                                {tel}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs bg-[#00a65a]/20 text-[#00a65a] px-2.5 py-0.5 rounded font-medium">
                            Concluído
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
                          <div className="bg-white rounded p-2 border border-gray-100">
                            <p className="text-gray-400 mb-0.5">Data</p>
                            <p className="font-medium text-gray-800">{dataObj.toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="bg-white rounded p-2 border border-gray-100">
                            <p className="text-gray-400 mb-0.5">Horário</p>
                            <p className="font-medium text-gray-800">{dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="bg-white rounded p-2 border border-gray-100">
                            <p className="text-gray-400 mb-0.5">Serviço</p>
                            <p className="font-medium text-gray-800">{svc?.name || `#${app.service_id}`}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                          💰 {svc ? `R$ ${svc.price.toFixed(2)}` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ===== MODAL DE AGENDAMENTOS PENDENTES (estilo corporate) ===== */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden modal-animate">
            
            {/* Header do modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-gray-800 text-base font-bold flex items-center gap-2">
                <Clock size={18} className="text-[#f39c12]" />
                Agendamentos Pendentes
              </h2>
              <button onClick={() => setShowPendingModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Lista de pendentes */}
            <div className="p-5 space-y-3 overflow-y-auto max-h-[60vh]">
              {loadingPending ? (
                <p className="text-center text-gray-400 py-8">Carregando...</p>
              ) : pendingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Check size={40} className="mx-auto text-[#00a65a] mb-3" />
                  <p className="text-gray-600 font-medium">Nenhum agendamento pendente</p>
                  <p className="text-gray-400 text-sm mt-1">Todos os agendamentos foram processados.</p>
                </div>
              ) : (
                pendingAppointments.map((app) => {
                  // Extrai nome e telefone do notes
                  const notes = app.notes || '';
                  const nomeMatch = notes.match(/Cliente:\s*(.*?)(?:\s*-\s*Tel:|$)/);
                  const telMatch = notes.match(/Tel:\s*(.*?)$/);
                  const nome = nomeMatch ? nomeMatch[1].trim() : `Cliente #${app.customer_id}`;
                  const tel = telMatch ? telMatch[1].trim() : '—';
                  
                  // Formata data
                  const dataObj = new Date(app.appointment_date);
                  const dataFormat = dataObj.toLocaleDateString('pt-BR');
                  const horaFormat = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={app.id} className="bg-gray-50 p-4 rounded border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-gray-800 font-semibold">{nome}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{tel}</p>
                        </div>
                        <span className="text-xs bg-[#f39c12]/20 text-[#f39c12] px-2.5 py-0.5 rounded font-medium">
                          Pendente
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1">📅 {dataFormat}</span>
                        <span className="flex items-center gap-1">⏰ {horaFormat}</span>
                        <span className="flex items-center gap-1">✂️ {servicesMap[app.service_id]?.name || `Serviço #${app.service_id}`}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleChangeStatus(app.id, 'completed')}
                          disabled={processingId === app.id}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#00a65a] hover:bg-[#008d4c] text-white py-2 rounded text-sm font-semibold transition disabled:opacity-50"
                        >
                          <Check size={15} />
                          {processingId === app.id ? '...' : 'Aprovar'}
                        </button>
                        <button
                          onClick={() => handleChangeStatus(app.id, 'canceled')}
                          disabled={processingId === app.id}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#dd4b39] hover:bg-[#c23321] text-white py-2 rounded text-sm font-semibold transition disabled:opacity-50"
                        >
                          <Ban size={15} />
                          {processingId === app.id ? '...' : 'Cancelar'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

            {/* ===== MODAL DE AVALIAÇÕES DE POSTS PENDENTES ===== */}
      {showPostReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden modal-animate">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-gray-800 text-base font-bold flex items-center gap-2">
                <Star size={18} className="text-[#f39c12]" fill="currentColor" />
                Avaliações de Posts Pendentes
                {pendingPostReviewCount > 0 && (
                  <span className="bg-[#dd4b39] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingPostReviewCount}
                  </span>
                )}
              </h2>
              <button onClick={() => setShowPostReviewModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Lista */}
            <div className="p-5 space-y-3 overflow-y-auto max-h-[60vh]">
              {loadingPostReviews ? (
                <p className="text-center text-gray-400 py-8">Carregando...</p>
              ) : pendingPostReviews.length === 0 ? (
                <div className="text-center py-8">
                  <Check size={40} className="mx-auto text-[#00a65a] mb-3" />
                  <p className="text-gray-600 font-medium">Nenhuma avaliação de post pendente</p>
                  <p className="text-gray-400 text-sm mt-1">Todas foram processadas.</p>
                </div>
              ) : (
                pendingPostReviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-800 font-semibold text-sm">{review.customer_name}</p>
                        <span className="text-[10px] text-gray-400">Post #{review.post_id}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={star <= review.rating ? 'text-[#f39c12]' : 'text-gray-300'}
                            fill={star <= review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-3">
                      {new Date(review.created_at).toLocaleDateString('pt-BR')} às {new Date(review.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprovePostReview(review.id)}
                        disabled={processingPostReviewId === review.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#00a65a] hover:bg-[#008d4c] text-white py-2 rounded text-sm font-semibold transition disabled:opacity-50"
                      >
                        <Check size={15} />
                        {processingPostReviewId === review.id ? '...' : 'Aprovar'}
                      </button>
                      <button
                        onClick={() => handleRejectPostReview(review.id)}
                        disabled={processingPostReviewId === review.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#dd4b39] hover:bg-[#c23321] text-white py-2 rounded text-sm font-semibold transition disabled:opacity-50"
                      >
                        <Ban size={15} />
                        {processingPostReviewId === review.id ? '...' : 'Rejeitar'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE AVALIAÇÕES PENDENTES (estilo corporate) ===== */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden modal-animate">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-gray-800 text-base font-bold flex items-center gap-2">
                <Star size={18} className="text-[#f39c12]" fill="currentColor" />
                Avaliações Pendentes
                {pendingReviewCount > 0 && (
                  <span className="bg-[#dd4b39] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingReviewCount}
                  </span>
                )}
              </h2>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Lista */}
            <div className="p-5 space-y-3 overflow-y-auto max-h-[60vh]">
              {loadingReviews ? (
                <p className="text-center text-gray-400 py-8">Carregando...</p>
              ) : pendingReviews.length === 0 ? (
                <div className="text-center py-8">
                  <Check size={40} className="mx-auto text-[#00a65a] mb-3" />
                  <p className="text-gray-600 font-medium">Nenhuma avaliação pendente</p>
                  <p className="text-gray-400 text-sm mt-1">Todas as avaliações foram processadas.</p>
                </div>
              ) : (
                pendingReviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-800 font-semibold">{review.customer_name}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={star <= review.rating ? 'text-[#f39c12]' : 'text-gray-300'}
                            fill={star <= review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{review.comment}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveReview(review.id)}
                        disabled={processingReviewId === review.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#00a65a] hover:bg-[#008d4c] text-white py-2 rounded text-sm font-semibold transition disabled:opacity-50"
                      >
                        <Check size={15} />
                        {processingReviewId === review.id ? '...' : 'Aprovar'}
                      </button>
                      <button
                        onClick={() => handleRejectReview(review.id)}
                        disabled={processingReviewId === review.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#dd4b39] hover:bg-[#c23321] text-white py-2 rounded text-sm font-semibold transition disabled:opacity-50"
                      >
                        <Ban size={15} />
                        {processingReviewId === review.id ? '...' : 'Rejeitar'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
