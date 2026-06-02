"use client";

import { useCartStore } from "../../../../core/stores/useCartStore";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Package, Edit2 } from "lucide-react";
import { formatCurrency, cn } from "../../../../shared/utils";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ProductModal } from "../product/ProductModal";
import { useProducts } from "../../hooks/useProducts";
import { useHasHydrated } from "../../../../core/hooks/useHasHydrated";

export function CartSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const hasHydrated = useHasHydrated();
  const { items, removeItem, updateQuantity, getSubtotal } = useCartStore() as any;
  const { products } = useProducts() as any;
  const total = hasHydrated ? getSubtotal() : 0;
  const cartItems = hasHydrated ? items : [];
  const [slug, setSlug] = useState<string>("");
  
  const [editingItem, setEditingItem] = useState<{ index: number; data: any } | null>(null);

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  const handleEditClick = (index: number, item: any) => {
    const originalProduct = products?.find((p: any) => p.id === item.productId);
    if (originalProduct) {
        setEditingItem({ index, data: { ...item, ...originalProduct, id: item.productId } });
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <ProductModal 
            isOpen={!!editingItem}
            onClose={() => setEditingItem(null)}
            product={editingItem?.data}
            editIndex={editingItem?.index}
            initialData={editingItem?.data}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100]"
          />
          
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-[101] shadow-[0_0_50px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden"
          >
            {/* Header del Carrello con Estetica Moderna */}
            <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-950 rounded-3xl flex items-center justify-center text-primary shadow-2xl shadow-slate-950/20 group cursor-default">
                  <ShoppingBag size={28} className="group-hover:rotate-12 transition-transform duration-500" />
                </div>
                <div>
                  <h3 className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tighter leading-none mb-1.5">Meus Desejos</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">{cartItems.length} {cartItems.length === 1 ? 'item selecionado' : 'itens selecionados'}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 hover:text-slate-950 hover:bg-white hover:shadow-xl transition-all duration-500 hover:rotate-90"
              >
                <X size={24} />
              </button>
            </div>

            {/* Lista di Prodotto Premium */}
            <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar scroll-smooth">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                    <div className="relative w-32 h-32 bg-slate-50 rounded-[4rem] flex items-center justify-center text-slate-200 border border-white">
                        <Package size={56} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">Opa! Cesto Vazio</h4>
                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] max-w-50 mx-auto leading-relaxed">Sua próxima experiência inesquecível começa com um clique.</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="px-10 py-5 bg-slate-950 text-white rounded-2xl text-label font-body font-medium uppercase tracking-[0.06em] hover:bg-primary hover:scale-105 active:scale-95 transition-all duration-500 shadow-xl shadow-slate-950/10"
                  >
                    Ver Cardápio Premium
                  </button>
                </div>
              ) : (
                cartItems.map((item: any, index: number) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={index}
                    className="p-6 bg-white border border-slate-50 rounded-[2.5rem] group hover:border-primary/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-500 relative"
                  >
                    <div className="flex gap-6">
                      <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 shrink-0 shadow-lg group-hover:rotate-3 transition-transform duration-500">
                        <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                        />
                      </div>
                      
                      <div className="flex-1 space-y-1 pt-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-body font-bold text-body-strong text-slate-950 uppercase tracking-tight leading-none group-hover:text-primary transition-colors">{item.name}</h4>
                          <button 
                            onClick={() => removeItem(index)}
                            className="text-slate-200 hover:text-rose-500 transition-colors bg-slate-50 p-2.5 rounded-xl hover:bg-rose-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <span className="text-label font-body font-medium text-primary uppercase tracking-[0.06em]">{item.variation || 'Tamanho Padrão'}</span>
                        
                        <div className="flex justify-between items-center pt-5">
                          <div className="flex items-center bg-slate-950 rounded-2xl p-1.5 shadow-xl">
                            <button 
                              onClick={() => updateQuantity(index, Math.max(1, item.quantity - 1))}
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:bg-white/10 active:scale-90"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-8 text-center text-body font-mono font-medium text-white">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:bg-white/10 active:scale-90"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => handleEditClick(index, item)}
                              className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-950 hover:text-white transition-all shadow-sm active:scale-90"
                            >
                              <Edit2 size={18} />
                            </button>
                            <span className="font-mono font-medium text-slate-950 text-heading-3 tracking-tighter">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Premium Checkout Footer */}
            {cartItems.length > 0 && (
              <div className="p-10 bg-white border-t border-slate-50 shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center">
                    <span className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Subtotal</span>
                    <span className="font-mono font-medium text-slate-950 tracking-tighter">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Logística de Entrega</span>
                    <span className="text-label font-body font-medium text-emerald-500 uppercase tracking-[0.06em] bg-emerald-50 px-3 py-1 rounded-full">Cortesia Premium</span>
                  </div>
                  <div className="h-px bg-slate-100 my-4" />
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <span className="text-label font-body font-medium text-slate-950 uppercase tracking-[0.06em]">Total Investido</span>
                        <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Taxas e serviços inclusos</p>
                    </div>
                    <span className="text-heading-1 font-mono font-medium text-slate-950 tracking-tighter">{formatCurrency(total)}</span>
                  </div>
                </div>

                <Link 
                  href={`/${slug}/checkout`} 
                  onClick={onClose}
                  className="h-20 w-full bg-slate-950 text-white rounded-[2rem] font-body font-bold uppercase tracking-[0.06em] text-label flex items-center justify-center gap-5 shadow-2xl shadow-slate-950/20 hover:bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 group overflow-hidden relative"
                >
                  <span className="relative z-10 font-body font-bold">Iniciar Finalização</span>
                  <ArrowRight size={20} className="relative z-10 group-hover:translate-x-3 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}