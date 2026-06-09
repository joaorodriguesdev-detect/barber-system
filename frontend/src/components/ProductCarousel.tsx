'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, ChevronRight, Sparkles, Plus } from 'lucide-react';

export default function ProductCarousel() {
  const [products, setProducts] = useState<any[]>([]);

  // Carrega os produtos salvos pelo Admin
  useEffect(() => {
    const loadProducts = () => {
      const stored = localStorage.getItem('vitrine_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        // Produtos padrão caso o admin ainda não tenha cadastrado nada
        const defaultProducts = [
          { id: 1, name: 'Pomada Efeito Matte', price: 45.90, desc: 'Alta fixação e efeito seco', tag: 'Mais Vendido', gradient: 'from-violet-500/20 to-blue-500/20', iconColor: 'text-violet-400' },
          { id: 2, name: 'Óleo para Barba', price: 35.00, desc: 'Hidratação e brilho intenso', tag: 'Novo', gradient: 'from-blue-500/20 to-emerald-500/20', iconColor: 'text-blue-400' }
        ];
        setProducts(defaultProducts);
        localStorage.setItem('vitrine_products', JSON.stringify(defaultProducts));
      }
    };

    loadProducts();
    
    // Fica "escutando" se o Admin mudou algo
    window.addEventListener('storage', loadProducts);
    return () => window.removeEventListener('storage', loadProducts);
  }, []);

  if (products.length === 0) return null; // Esconde se não tiver produto

  return (
    <section className="space-y-4 py-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-zinc-300 text-[11px] font-semibold uppercase tracking-[0.2em]">
          <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <ShoppingBag size={12} className="text-violet-400" />
          </div>
          <span>Vitrine de Produtos</span>
        </div>
        <button className="text-[10px] text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1 hover:text-violet-300 transition">
          Ver todos <ChevronRight size={12} />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-none snap-x snap-mandatory px-1">
        {products.map((prod) => (
          <div 
            key={prod.id} 
            className="snap-start shrink-0 w-44 bg-[#0A0A0A] border border-white/[0.05] rounded-3xl p-3 relative overflow-hidden group hover:border-violet-500/30 transition-all duration-500"
          >
            <div className={`w-full h-32 rounded-2xl bg-gradient-to-br ${prod.gradient || 'from-violet-500/20 to-blue-500/20'} border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden`}>
              <Sparkles size={28} className={`${prod.iconColor || 'text-violet-400'} opacity-50`} />
              
              {prod.tag && (
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg">
                  <span className="text-[8px] font-bold text-white uppercase tracking-widest">{prod.tag}</span>
                </div>
              )}
            </div>

            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-bold text-zinc-100 leading-tight">{prod.name}</h3>
              <p className="text-[10px] text-zinc-500 line-clamp-2">{prod.desc}</p>
            </div>

            <div className="flex items-center justify-between mt-auto">
              <span className="text-sm font-extrabold text-white">R$ {parseFloat(prod.price).toFixed(2)}</span>
              <button className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}