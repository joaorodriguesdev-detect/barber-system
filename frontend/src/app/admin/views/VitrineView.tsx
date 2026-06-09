'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Plus, X, ShoppingBag, Edit2, Trash2 } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  desc: string;
  tag: string;
  gradient: string;
  iconColor: string;
}

export default function VitrineView() {
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodTag, setProdTag] = useState('');
  const [prodColor, setProdColor] = useState('violet');

  useEffect(() => {
    const stored = localStorage.getItem('vitrine_products');
    if (stored) {
      setAdminProducts(JSON.parse(stored));
    }
  }, []);

  const handleSaveProduct = (e: FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;
    
    let gradient = 'from-violet-500/20 to-blue-500/20';
    let iconColor = 'text-violet-400';
    
    if (prodColor === 'emerald') { gradient = 'from-emerald-500/20 to-teal-500/20'; iconColor = 'text-emerald-400'; }
    if (prodColor === 'amber') { gradient = 'from-amber-500/20 to-orange-500/20'; iconColor = 'text-amber-400'; }
    if (prodColor === 'blue') { gradient = 'from-blue-500/20 to-cyan-500/20'; iconColor = 'text-blue-400'; }

    const newProd: Product = {
      id: editingProductId || Date.now(),
      name: prodName,
      price: parseFloat(prodPrice),
      desc: prodDesc,
      tag: prodTag,
      gradient,
      iconColor
    };

    let updated: Product[] = [];
    if (editingProductId) {
      updated = adminProducts.map(p => p.id === editingProductId ? newProd : p);
    } else {
      updated = [...adminProducts, newProd];
    }

    setAdminProducts(updated);
    localStorage.setItem('vitrine_products', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    setShowProductForm(false);
    setEditingProductId(null);
    setProdName(''); setProdPrice(''); setProdDesc(''); setProdTag(''); setProdColor('violet');
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProdName(prod.name);
    setProdPrice(prod.price.toString());
    setProdDesc(prod.desc);
    setProdTag(prod.tag || '');
    
    if (prod.gradient?.includes('emerald')) setProdColor('emerald');
    else if (prod.gradient?.includes('amber')) setProdColor('amber');
    else if (prod.gradient?.includes('blue')) setProdColor('blue');
    else setProdColor('violet');
    
    setShowProductForm(true);
  };

  const handleDeleteProduct = (id: number) => {
    if (!confirm('Excluir este produto da vitrine?')) return;
    const updated = adminProducts.filter(p => p.id !== id);
    setAdminProducts(updated);
    localStorage.setItem('vitrine_products', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              <ShoppingBag size={22} className="text-violet-400" /> Vitrine de Produtos
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Gerencie os produtos extras oferecidos na barbearia.</p>
          </div>
          <button
            onClick={() => {
              if (showProductForm) {
                setShowProductForm(false);
                setEditingProductId(null);
                setProdName(''); setProdPrice(''); setProdDesc(''); setProdTag(''); setProdColor('violet');
              } else {
                setShowProductForm(true);
              }
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-lg"
          >
            {showProductForm ? <X size={16} /> : <Plus size={16} />}
            {showProductForm ? 'Cancelar' : 'Adicionar Produto'}
          </button>
        </div>

        {showProductForm && (
          <form onSubmit={handleSaveProduct} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Nome do Produto</label>
                <input type="text" required value={prodName} onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Pomada Efeito Matte"
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Preço (R$)</label>
                <input type="number" step="0.01" min="0" required value={prodPrice} onChange={(e) => setProdPrice(e.target.value)}
                  placeholder="45.90"
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Descrição Curta</label>
                <input type="text" value={prodDesc} onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Alta fixação e efeito seco"
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Etiqueta</label>
                  <input type="text" value={prodTag} onChange={(e) => setProdTag(e.target.value)}
                    placeholder="Ex: Novo, Promoção..."
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Cor do Fundo</label>
                  <select value={prodColor} onChange={(e) => setProdColor(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none transition cursor-pointer"
                  >
                    <option value="violet">Roxo/Azul</option>
                    <option value="emerald">Verde</option>
                    <option value="amber">Laranja/Amarelo</option>
                    <option value="blue">Azul/Ciano</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-white/5 pt-5">
              <button className="bg-white text-black hover:bg-zinc-200 text-sm font-bold px-8 py-3 rounded-xl transition flex items-center gap-2">
                {editingProductId ? 'Atualizar Produto' : 'Salvar Produto'}
              </button>
            </div>
          </form>
        )}

        {adminProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#0A0A0A] rounded-2xl border border-dashed border-white/10">
            <ShoppingBag size={40} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-sm">Sua vitrine está vazia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {adminProducts.map((prod) => (
              <div key={prod.id} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-4 relative overflow-hidden group">
                <div className={`w-full h-32 rounded-2xl bg-gradient-to-br ${prod.gradient || 'from-violet-500/20 to-blue-500/20'} border border-white/5 flex items-center justify-center mb-4 relative`}>
                  <ShoppingBag size={28} className={`${prod.iconColor || 'text-violet-400'} opacity-50`} />
                  {prod.tag && (
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg">
                      <span className="text-[8px] font-bold text-white uppercase tracking-widest">{prod.tag}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 mb-4">
                  <h3 className="text-sm font-bold text-zinc-100">{prod.name}</h3>
                  <p className="text-[10px] text-zinc-500 line-clamp-2">{prod.desc}</p>
                  <p className="text-sm font-extrabold text-white pt-1">R$ {parseFloat(String(prod.price)).toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditProduct(prod)} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold py-2 rounded-xl transition flex items-center justify-center gap-1">
                    <Edit2 size={12} /> Editar
                  </button>
                  <button onClick={() => handleDeleteProduct(prod.id)} className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold py-2 rounded-xl transition flex items-center justify-center gap-1">
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}