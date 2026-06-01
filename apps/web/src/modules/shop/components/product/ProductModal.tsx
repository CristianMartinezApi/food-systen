import { useState, useMemo, useEffect } from "react";
import { X, Plus, Minus, ShoppingBag, Check, ChevronRight } from "lucide-react";
import { formatCurrency, cn } from "../../../../shared/utils";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { motion, AnimatePresence } from "framer-motion";

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
  
  // Tenta encontrar o tamanho correto pelo nome
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

  // Efeito para resetar/carregar dados quando abrir
  useEffect(() => {
    if (isOpen && product) {
        setQuantity(initialData?.quantity || 1);
        setSelectedSize(initialSize);
        setSelectedAddons(initialData?.addons || []);
        setRemovals(initialData?.removals || []);
        setObservations(initialData?.observations || "");
    }
  }, [isOpen, product, initialData, initialSize]);

  // Calcula o preço base (do tamanho ou o padrão)
  const basePrice = useMemo(() => {
    if (!product) return 0;
    return selectedSize ? selectedSize.price : (product.price || 0);
  }, [selectedSize, product]);

  // Calcula o valor total dos adicionais
  const addonsTotal = useMemo(() => {
    return selectedAddons.reduce((acc, addon) => acc + ((addon.price || 0) * (addon.quantity || 1)), 0);
  }, [selectedAddons]);

  const unitPrice = basePrice + addonsTotal;
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
        image: product.image // Garante que a imagem vá para o carrinho
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
        // Reset states
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
            className="bg-white w-full max-w-5xl h-[min(90vh,850px)] rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row"
          >
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 z-20 w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-900 shadow-xl border border-white/50 hover:bg-white transition-all active:scale-90"
            >
                <X size={24} />
            </button>

            {/* Imagem do Produto (Lado Esquerdo no Desktop) */}
            <div className="relative w-full md:w-5/12 h-48 md:h-full bg-slate-100 flex-shrink-0">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                   <ShoppingBag size={80} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-white/10" />
              
              <div className="absolute bottom-8 left-8 right-8 hidden md:block">
                 <span className="bg-primary text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-lg shadow-primary/30">
                    {product.category?.name || "Premium"}
                </span>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2 drop-shadow-md">{product.name}</h2>
              </div>
            </div>

            {/* Conteúdo (Lado Direito no Desktop - Scrollable) */}
            <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 custom-scrollbar">
                
                {/* Header Mobile Only */}
                <div className="md:hidden">
                    <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-2 inline-block">
                        {product.category?.name}
                    </span>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{product.name}</h2>
                </div>

                {/* Descrição */}
                <section>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                    {product.description || "Nenhuma descrição disponível para este prato, mas garantimos que é delicioso!"}
                    </p>
                </section>

                {/* Tamanhos */}
                {product.sizes && product.sizes.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-6 bg-primary rounded-full" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Escolha o Tamanho</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {product.sizes.map((size: any) => (
                                <button
                                    key={size.name}
                                    onClick={() => setSelectedSize(size)}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 transition-all flex items-center justify-between group",
                                        selectedSize?.name === size.name 
                                            ? "border-primary bg-primary/5 shadow-md" 
                                            : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                                    )}
                                >
                                    <div className="text-left">
                                        <p className={cn("font-black uppercase tracking-tighter", selectedSize?.name === size.name ? "text-primary" : "text-slate-600 group-hover:text-slate-900")}>
                                            {size.name}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400">
                                            {formatCurrency(size.price)}
                                        </p>
                                    </div>
                                    <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                        selectedSize?.name === size.name ? "border-primary bg-primary" : "border-slate-200 bg-white"
                                    )}>
                                        {selectedSize?.name === size.name && <Check size={14} className="text-white" strokeWidth={4} />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Adicionais */}
                {product.addons && product.addons.length > 0 && (
                     <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-6 bg-primary rounded-full" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Adicionais</h3>
                        </div>
                        <div className="space-y-2">
                            {product.addons.map((addon: any) => {
                                const selected = selectedAddons.find(a => a.name === addon.name);
                                const addonQty = selected?.quantity || 0;
                                
                                return (
                                    <div
                                        key={addon.name}
                                        className={cn(
                                            "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group",
                                            addonQty > 0 
                                                ? "border-primary bg-primary/5" 
                                                : "border-slate-100 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                addonQty > 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                                            )}>
                                                {addonQty > 0 ? <Check size={20} strokeWidth={3} /> : <Plus size={20} />}
                                            </div>
                                            <div className="text-left">
                                                <p className={cn("font-bold text-slate-700", addonQty > 0 && "text-primary")}>{addon.name}</p>
                                                <p className="text-xs font-black text-slate-400">+{formatCurrency(addon.price)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {addonQty > 0 && (
                                                <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl shadow-sm border border-slate-100">
                                                    <button 
                                                        onClick={() => updateAddonQuantity(addon, -1)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary transition-all"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="font-black text-slate-900 text-sm w-4 text-center">{addonQty}</span>
                                                    <button 
                                                        onClick={() => updateAddonQuantity(addon, 1)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary transition-all"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            {addonQty === 0 && (
                                                <button 
                                                    onClick={() => updateAddonQuantity(addon, 1)}
                                                    className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-primary/10 hover:text-primary transition-all"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Ingredientes / Removais */}
                {product.ingredients && product.ingredients.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-6 bg-primary rounded-full" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Remover Ingredientes?</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {product.ingredients.map((ingredient: string) => {
                                const isRemoved = removals.includes(ingredient);
                                return (
                                    <button
                                        key={ingredient}
                                        onClick={() => toggleRemoval(ingredient)}
                                        className={cn(
                                            "px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center gap-2",
                                            isRemoved 
                                                ? "border-rose-500 bg-rose-50 text-rose-600" 
                                                : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                                        )}
                                    >
                                        {isRemoved && <X size={14} strokeWidth={3} />}
                                        {ingredient}
                                        {isRemoved && <span className="text-[10px] ml-1 opacity-60">REMOVIDO</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Observações */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-6 bg-primary rounded-full" />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Alguma observação?</h3>
                    </div>
                    <textarea 
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Ex: Tirar cebola, ponto da carne, etc..."
                        className="w-full h-32 p-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:border-primary focus:bg-white transition-all outline-none font-medium text-slate-600 resize-none px-6"
                    />
                </section>
              </div>

              {/* Footer Fixo */}
              <div className="p-8 md:px-12 md:py-8 border-t border-slate-50 bg-white flex flex-col md:flex-row items-center gap-6 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] relative z-10">
                <div className="flex items-center justify-between w-full md:w-auto md:gap-8">
                     <div className="text-center md:text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Quantidade</p>
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                            <button 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 shadow-sm hover:text-primary transition-all active:scale-90"
                            >
                                <Minus size={18} />
                            </button>
                            <span className="w-10 text-center font-black text-xl text-slate-900">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 shadow-sm hover:text-primary transition-all active:scale-90"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                   </div>
                   
                   <div className="h-12 w-[1px] bg-slate-100 hidden md:block" />

                   <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                        <p className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(totalPrice)}</p>
                    </div>
                </div>
                
                <button 
                  onClick={handleAdd}
                  disabled={added}
                  className={cn(
                    "h-16 w-full md:flex-1 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] uppercase tracking-tighter text-lg",
                    added 
                        ? "bg-emerald-500 text-white shadow-emerald-200" 
                        : "bg-slate-900 text-white shadow-slate-200 hover:bg-black"
                  )}
                >
                  {added ? (
                    <>
                        <Check size={24} strokeWidth={3} /> {editIndex !== null ? "ATUALIZADO!" : "ADICIONADO!"}
                    </>
                  ) : (
                    <>
                        <ShoppingBag size={24} /> {editIndex !== null ? "ATUALIZAR ITEM" : "ADICIONAR AO PEDIDO"}
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
