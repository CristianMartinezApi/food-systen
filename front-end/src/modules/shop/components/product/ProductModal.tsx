import { useState, useMemo, useEffect } from "react";
import { X, Plus, Minus, ShoppingBag, Check } from "lucide-react";
import { formatCurrency, cn } from "../../../../shared/utils";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { motion, AnimatePresence } from "framer-motion";
import { clampDiscountPercent, getProductDiscountedPrice, hasProductDiscount } from "../../../../shared/utils/product";

interface ProductModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  editIndex?: number | null;
  initialData?: any;
}

export function ProductModal({ product, isOpen, onClose, editIndex = null, initialData = null }: ProductModalProps) {
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [added, setAdded] = useState(false);
  
  const initialSize = useMemo(() => {
    if (!product?.sizes || !initialData?.variation) return product?.sizes?.[0] || null;
    return product.sizes.find((s: any) => s.name === initialData.variation) || product.sizes[0];
  }, [product, initialData]);

  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [removals, setRemovals] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  
  const addItem = useCartStore((state: any) => state.addItem);
  const updateItem = useCartStore((state: any) => state.updateItem);

  useEffect(() => {
    if (isOpen && product) {
        setQuantity(initialData?.quantity || 1);
        setSelectedSize(initialSize);
        setSelectedAddons(initialData?.addons || []);
        setRemovals(initialData?.removals || []);
        setObservations(initialData?.observations || "");
    }
  }, [isOpen, product, initialData, initialSize]);

  const basePrice = useMemo(() => {
    if (!product) return 0;
    return selectedSize ? selectedSize.price : (product.price || 0);
  }, [selectedSize, product]);

  const addonsTotal = useMemo(() => {
    return selectedAddons.reduce((acc, addon) => acc + ((addon.price || 0) * (addon.quantity || 1)), 0);
  }, [selectedAddons]);

    const discountPercent = clampDiscountPercent(product?.discountPercent);
    const discountedBasePrice = getProductDiscountedPrice(basePrice, discountPercent);
    const unitPrice = discountedBasePrice + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    if (!product) return;
    
    const itemData = {
        productId: product.id,
        name: product.name,
        price: unitPrice,
        quantity: quantity,
        variation: selectedSize?.name,
        addons: selectedAddons,
        removals: removals,
        observations: observations,
        image: product.image
    };

    if (editIndex !== null) {
        updateItem(editIndex, itemData);
    } else {
        addItem(itemData);
    }

    setAdded(true);
    setTimeout(() => {
        setAdded(false);
        onClose();
        if (editIndex === null) {
            setQuantity(1);
            setSelectedSize(product?.sizes?.[0] || null);
            setSelectedAddons([]);
            setRemovals([]);
            setObservations("");
        }
    }, 1500);
  };

  const updateAddonQuantity = (addon: any, delta: number) => {
    setSelectedAddons(prev => {
      const existing = prev.find(a => a.name === addon.name);
      if (existing) {
        const newQuantity = (existing.quantity || 1) + delta;
        if (newQuantity <= 0) {
          return prev.filter(a => a.name !== addon.name);
        }
        return prev.map(a => a.name === addon.name ? { ...a, quantity: newQuantity } : a);
      } else if (delta > 0) {
        return [...prev, { ...addon, quantity: 1 }];
      }
      return prev;
    });
  };

  const toggleRemoval = (ingredient: string) => {
    setRemovals(prev => 
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && product && (
        <div className="fixed inset-0 z-120 flex items-center justify-center p-4">
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
            className="bg-white w-full max-w-6xl h-full md:h-[min(90vh,900px)] rounded-none md:rounded-[3rem] overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row"
          >
            <button 
                onClick={onClose}
                className="absolute top-4 md:top-8 right-4 md:right-8 z-50 w-12 h-12 md:w-14 md:h-14 bg-white/90 backdrop-blur-xl rounded-2xl flex items-center justify-center text-slate-900 shadow-2xl border border-white/50 hover:bg-slate-950 hover:text-white transition-all duration-500 active:scale-90 group"
            >
                <X size={20} className="md:size-6 group-hover:rotate-90 transition-transform duration-500" />
            </button>

            <div className="relative w-full md:w-1/2 h-64 md:h-full bg-slate-100 shrink-0 group overflow-hidden">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-200">
                   <ShoppingBag size={120} strokeWidth={1} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent md:hidden" />
              
              <div className="absolute bottom-8 left-8 right-8 md:hidden">
                <h2 className="text-heading-1 font-display font-bold text-white uppercase tracking-tighter drop-shadow-xl">
                  {product.name}
                </h2>
              </div>
            </div>

            <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-14">
                    <div className="hidden md:block mb-12">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="h-0.5 w-10 bg-primary" />
                            <span className="text-label font-body font-bold text-primary uppercase tracking-[0.3em] text-[10px]">Criação Exclusiva</span>
                        </div>
                        <h2 className="text-display font-display font-bold text-slate-950 uppercase tracking-tighter leading-[0.9] mb-6">
                            {product.name}
                        </h2>
                        <p className="text-body-lg font-body text-slate-400 uppercase tracking-widest leading-relaxed max-w-md">
                            {product.description || "Uma composição harmônica de ingredientes selecionados para paladares exigentes."}
                        </p>
                    </div>

                    <div className="space-y-12">
                        {hasProductDiscount(discountPercent) && (
                            <section className="rounded-4xl border border-rose-100 bg-rose-50 p-6 flex items-center justify-between gap-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Promoção ativa</p>
                                    <p className="text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight mt-2">Desconto de {discountPercent}% aplicado automaticamente</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 line-through">{formatCurrency(basePrice)}</p>
                                    <p className="text-heading-2 font-mono font-bold text-rose-500 tracking-tighter">{formatCurrency(discountedBasePrice)}</p>
                                </div>
                            </section>
                        )}

                        {product.sizes && product.sizes.length > 0 && (
                            <section>
                                <h3 className="text-label font-body font-bold text-slate-300 uppercase tracking-[0.2em] mb-6 border-l-2 border-primary pl-4">Selecione o Corte</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {product.sizes.map((size: any) => (
                                        <button
                                            key={size.name}
                                            onClick={() => setSelectedSize(size)}
                                            className={cn(
                                                "p-6 rounded-2xl border-2 text-left transition-all duration-500 flex items-center justify-between group",
                                                selectedSize?.name === size.name 
                                                    ? "bg-slate-950 border-slate-950 shadow-xl shadow-slate-950/20 translate-x-2" 
                                                    : "bg-white border-slate-50 hover:border-slate-100"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "font-display font-bold text-heading-3 uppercase tracking-tight",
                                                    selectedSize?.name === size.name ? "text-white" : "text-slate-950"
                                                )}>{size.name}</span>
                                                <span className="text-label font-body font-medium text-slate-400 uppercase tracking-widest text-[10px] mt-1">Porção Individual</span>
                                            </div>
                                            <span className={cn(
                                                "font-mono font-bold text-lg",
                                                selectedSize?.name === size.name ? "text-primary" : "text-slate-950"
                                            )}>{formatCurrency(size.price)}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {product.addons && product.addons.length > 0 && (
                            <section>
                                <h3 className="text-label font-body font-bold text-slate-300 uppercase tracking-[0.2em] mb-6 border-l-2 border-primary pl-4">Personalização</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {product.addons.map((addon: any) => {
                                        const current = selectedAddons.find(a => a.name === addon.name);
                                        return (
                                            <div 
                                                key={addon.name}
                                                className={cn(
                                                    "p-6 rounded-2xl border-2 transition-all duration-500 flex items-center justify-between",
                                                    current ? "bg-slate-50 border-primary/20" : "bg-white border-slate-50"
                                                )}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-body font-bold text-slate-900 uppercase tracking-tight">{addon.name}</span>
                                                    <span className="text-numeric font-mono text-primary font-bold text-sm mt-1">+{formatCurrency(addon.price)}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                                                    <button 
                                                        onClick={() => updateAddonQuantity(addon, -1)}
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-rose-500 transition-all"
                                                    >
                                                        <Minus size={18} />
                                                    </button>
                                                    <span className="w-8 text-center font-mono font-bold text-slate-950 text-lg">
                                                        {current?.quantity || 0}
                                                    </span>
                                                    <button 
                                                        onClick={() => updateAddonQuantity(addon, 1)}
                                                        className="w-10 h-10 rounded-lg bg-slate-950 text-white flex items-center justify-center transition-all hover:bg-black active:scale-95"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {product.ingredients && product.ingredients.length > 0 && (
                            <section>
                                <h3 className="text-label font-body font-bold text-slate-300 uppercase tracking-[0.2em] mb-6 border-l-2 border-primary pl-4">Retirada de Itens</h3>
                                <div className="flex flex-wrap gap-3">
                                    {product.ingredients.map((ing: string) => (
                                        <button
                                            key={ing}
                                            onClick={() => toggleRemoval(ing)}
                                            className={cn(
                                                "px-6 py-3 rounded-xl border-2 font-body font-bold text-[10px] uppercase tracking-[0.15em] transition-all duration-300",
                                                removals.includes(ing)
                                                    ? "bg-rose-50 border-rose-200 text-rose-500 line-through scale-95"
                                                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                            )}
                                        >
                                            {ing}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section>
                            <h3 className="text-label font-body font-bold text-slate-300 uppercase tracking-[0.2em] mb-6 border-l-2 border-primary pl-4">Concierge (Observações)</h3>
                            <textarea 
                                value={observations}
                                onChange={(e) => setObservations(e.target.value)}
                                placeholder="Ponto da carne, alergias ou solicitações especiais..."
                                className="w-full h-32 p-6 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-8 focus:ring-slate-950/5 focus:border-slate-950/10 transition-all font-body font-medium text-slate-950 outline-none placeholder:text-slate-300 resize-none"
                            />
                        </section>
                    </div>
                </div>

                <div className="p-8 md:p-14 bg-white border-t border-slate-50 shadow-[0_-20px_40px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-center gap-8">
                    <div className="flex items-center gap-6 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <button 
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-950 transition-colors"
                        >
                            <Minus size={24} />
                        </button>
                        <span className="w-12 text-center text-heading-3 font-mono font-bold text-slate-950">{quantity}</span>
                        <button 
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-14 h-14 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xl shadow-slate-950/20 active:scale-95 transition-all"
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    <button
                        onClick={handleAdd}
                        disabled={added}
                        className={cn(
                            "flex-1 h-20 rounded-3xl flex items-center justify-between px-10 transition-all duration-500 active:scale-[0.98]",
                            added ? "bg-emerald-500 text-white" : "bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-[1.02]"
                        )}
                    >
                        <span className="text-label font-body font-bold uppercase tracking-widest">
                            {added ? (
                                <span className="flex items-center gap-3">
                                    <Check size={20} strokeWidth={3} /> Item Adicionado
                                </span>
                            ) : editIndex !== null ? "Atualizar Reserva" : "Adicionar ao Carrinho"}
                        </span>
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-px bg-white/20" />
                            <span className="text-heading-3 font-mono font-medium tracking-tighter">
                                {formatCurrency(totalPrice)}
                            </span>
                        </div>
                    </button>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
