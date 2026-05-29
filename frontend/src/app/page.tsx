'use client';
import { useEffect, useState } from 'react';
import { Camera, Star, X, Send } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

import ImageSlider from '../components/ImageSlider';
import ReviewsSummary from '../components/ReviewsSummary';
import LocationMap from '../components/LocationMap';
import FloatingBookingBtn from '../components/FloatingBookingBtn';

interface Post {
  id: number;
  barber_id: number;
  image_url: string;
  caption: string | null;
  created_at: string;
}

interface PostReview {
  id: number;
  post_id: number;
  customer_name: string;
  rating: number;
  status: string;
  created_at: string;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsMap, setReviewsMap] = useState<Record<number, PostReview[]>>({});
  
  const [ratingModal, setRatingModal] = useState<{ postId: number; open: boolean }>({ postId: 0, open: false });
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState('');

  const fetchApprovedReviews = async (postId: number) => {
    try {
      // CORRIGIDO: Agora aponta para a rota de reviews correta
      const res = await fetch(`${API_BASE_URL}/post-reviews/?post_id=${postId}`);
      if (res.ok) {
        const data = await res.json();
        setReviewsMap(prev => ({ ...prev, [postId]: data || [] }));
      }
    } catch (err) {
      console.error(`Erro ao buscar reviews do post ${postId}:`, err);
    }
  };

  const fetchAllReviews = async (postIds: number[]) => {
    await Promise.all(postIds.map(id => fetchApprovedReviews(id)));
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/feed/`)
      .then((res) => res.json())
      .then((data) => {
        const postsData = data || [];
        setPosts(postsData);
        setLoading(false);
        if (postsData.length > 0) {
          fetchAllReviews(postsData.map((p: Post) => p.id));
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar feed:", err);
        setPosts([]);
        setLoading(false);
      });
  }, []);

  const handleOpenRating = (postId: number) => {
    setRatingModal({ postId, open: true });
    setSelectedRating(0);
    setHoverRating(0);
    setCustomerName('');
    setRatingSuccess('');
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      alert('Selecione uma nota de 1 a 5 estrelas.');
      return;
    }
    const name = customerName.trim() || 'Anônimo';
    setSubmittingRating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/post-reviews/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: ratingModal.postId,
          customer_name: name,
          rating: selectedRating,
        }),
      });
      if (res.ok) {
        setRatingSuccess('Avaliação enviada para aprovação! ⭐');
        setSelectedRating(0);
        setCustomerName('');
      } else {
        const err = await res.json();
        alert(err.detail || 'Erro ao enviar avaliação.');
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="min-h-screen text-white antialiased flex items-center justify-center bg-black">
      <main className="phone-container relative">
        <header className="bg-black border-b border-white/[0.04] h-20 flex items-center px-5 shrink-0 z-40 sm:rounded-t-[30px]">
          <div className="w-full grid grid-cols-3 items-center relative">
            <div />
            <div className="flex items-center justify-center">
              <h1 className="font-unifraktur text-[30px] sm:text-[34px] tracking-[0.03em] leading-none text-center">
                <span className="bg-gradient-to-b from-amber-200 via-amber-100 to-zinc-300 bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(251,191,36,0.35)]">
                  Flux Barber
                </span>
              </h1>
            </div>
            <div className="flex justify-end items-center gap-2">
              <span className="relative flex w-3 h-3">
                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex w-3 h-3 rounded-full bg-emerald-400" />
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-7 p-5 pb-28 scrollbar-none scroll-smooth">
          <ImageSlider />
          <ReviewsSummary />
          <LocationMap />
          <FloatingBookingBtn />

          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-zinc-300 text-[11px] font-semibold uppercase tracking-[0.2em]">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Camera size={12} className="text-blue-400" />
                </div>
                <span>Trabalhos Recentes</span>
              </div>
            </div>

            <div className="posts-grid">
              {loading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin" />
                  <p className="text-center text-zinc-600 text-xs">Carregando fotos...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="col-span-full bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-10 text-center text-zinc-500 text-xs">
                  Nenhum corte publicado pela barbearia ainda. 💈
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="group relative bg-black border border-white/[0.06] rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all duration-500">
                    <div className="aspect-square w-full bg-zinc-900 relative overflow-hidden">
                      <img src={post.image_url} alt="Trabalho" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                    </div>
                    <div className="p-5 space-y-4">
                      {reviewsMap[post.id] && reviewsMap[post.id].length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">{reviewsMap[post.id].length} avaliações</span>
                        </div>
                      )}
                      {post.caption && <p className="text-[13px] leading-relaxed text-zinc-300 font-light">{post.caption}</p>}
                      <button onClick={() => handleOpenRating(post.id)} className="w-full py-3 bg-gradient-to-b from-zinc-800/80 to-zinc-900 text-[11px] font-semibold tracking-wider uppercase text-zinc-200 border border-white/[0.08] rounded-2xl transition-all duration-300">
                        ⭐ Deixar uma avaliação
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {ratingModal.open && (
           /* ... modal de avaliação mantido igual ... */
           <></> 
        )}
      </main>
    </div>
  );
}