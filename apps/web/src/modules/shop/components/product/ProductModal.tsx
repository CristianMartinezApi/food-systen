import { useState } from "react";
import { X, Plus, Minus, ShoppingBag, Check } from "lucide-react";
import { formatCurrency, cn } from "../../../../shared/utils";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { motion, AnimatePresence } from "framer-motion";

interface ProductModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state: any) => state.addItem);

  const handleAdd = () => {
    addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity
    });
    setAdded(true);
    setTimeout(() => {
        setAdded(false);
        onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 grid grid-cols-1 md:grid-cols-2"
          >
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 z-20 w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-900 shadow-xl border border-white/50 hover:bg-white transition-all active:scale-90"
            >
                <X size={24} />
            </button>

            {/* Imagem do Produto */}
            <div className="relative h-64 md:h-full bg-slate-100">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                   <ShoppingBag size={80} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:hidden" />
            </div>

            {/* Detalhes do Produto */}
            <div className="p-8 md:p-12 flex flex-col">
              <div className="flex-1">
                <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                    {product.category}
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-none">{product.name}</h2>
                <p className="text-slate-500 font-medium text-lg leading-relaxed mb-8">
                  {product.description || "Nenhuma descrição disponível para este prato, mas garantimos que é delicioso!"}
                </p>

                <div className="flex items-center gap-6 mb-10">
                   <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Unitário</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(product.price)}</p>
                   </div>
                   <div className="h-10 w-[1px] bg-slate-100" />
                   <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-center">Quantidade</p>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                            <button 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 shadow-sm hover:text-primary transition-all"
                            >
                                <Minus size={18} />
                            </button>
                            <span className="w-12 text-center font-black text-xl text-slate-900">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 shadow-sm hover:text-primary transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                   </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 flex items-center justify-between gap-6">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal</p>
                    <p className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(product.price * quantity)}</p>
                </div>
                
                <button 
                  onClick={handleAdd}
                  disabled={added}
                  className={cn(
                    "h-16 flex-1 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98]",
                    added 
                        ? "bg-emerald-500 text-white shadow-emerald-200" 
                        : "bg-slate-900 text-white shadow-slate-200 hover:bg-black"
                  )}
                >
                  {added ? (
                    <>
                        <Check size={24} /> ADICIONADO!
                    </>
                  ) : (
                    <>
                        <ShoppingBag size={24} /> ADICIONAR AO CARRINHO
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
