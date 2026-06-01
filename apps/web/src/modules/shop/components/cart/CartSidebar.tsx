import { useCartStore } from "../../../../core/stores/useCartStore";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Package } from "lucide-react";
import { formatCurrency } from "../../../../shared/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export function CartSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, getSubtotal } = useCartStore();
  const total = getSubtotal();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header do Carrinho */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <ShoppingBag size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Seu Pedido</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} ITENS NO CARRINHO</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 active:scale-95 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Lista de Itens */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <Package size={48} className="text-slate-200" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Carrinho Vazio</h3>
                  <p className="text-sm font-medium text-slate-400 max-w-[200px] mt-2">Escolha seus pratos favoritos para começar o pedido.</p>
                </div>
              ) : (
                items.map((item: any, index: number) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={`${item.productId}-${index}`} 
                    className="flex gap-4 group"
                  >
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-50">
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-slate-900 uppercase tracking-tight leading-tight">{item.name}</h4>
                        <button 
                          onClick={() => removeItem(index)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-primary font-black text-lg mb-3">{formatCurrency(item.price * item.quantity)}</p>
                      
                      <div className="flex items-center gap-1 bg-slate-50 w-fit rounded-xl p-1 border border-slate-100">
                        <button 
                          onClick={() => updateQuantity(index, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white transition-all shadow-sm"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center font-black text-slate-900 text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white transition-all shadow-sm"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer do Carrinho */}
            {items.length > 0 && (
              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                    <span>Subtotal</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                    <span>Taxa de Entrega</span>
                    <span className="text-emerald-500">GRÁTIS</span>
                  </div>
                  <div className="h-[1px] bg-slate-200 my-2" />
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Total Geral</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(total)}</span>
                  </div>
                </div>

                <Link 
                  href="/checkout" 
                  onClick={onClose}
                  className="h-16 w-full bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                  FINALIZAR PEDIDO
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
