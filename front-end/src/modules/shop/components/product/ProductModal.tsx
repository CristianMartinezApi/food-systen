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
    const isOutOfStock = product?.trackStock && product?.stockQuantity <= 0;

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

    // Bloquear scroll do body quando o modal estiver aberto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.height = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.height = 'unset';
        };
    }, [isOpen]);

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
                <div className="fixed inset-0 z-120 flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="bg-slate-100 w-full max-w-none md:max-w-6xl h-[92dvh] md:h-[min(90vh,900px)] rounded-t-2xl md:rounded-3xl overflow-hidden shadow-[0_-15px_60px_rgba(15,23,42,0.15)] md:shadow-[0_35px_80px_rgba(15,23,42,0.28)] relative z-10 flex flex-col md:flex-row"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 md:top-8 right-4 md:right-8 z-50 w-10 h-10 md:w-14 md:h-14 bg-white/90 md:bg-slate-100/95 backdrop-blur-xl rounded-full md:rounded-2xl flex items-center justify-center text-slate-900 shadow-xl border border-slate-200/50 hover:bg-slate-950 hover:text-white transition-all duration-500 active:scale-90 group"
                        >
                            <X size={18} className="md:size-6 group-hover:rotate-90 transition-transform duration-500" />
                        </button>

                        <div className="relative w-full md:w-1/2 h-[35vh] md:h-full bg-slate-200 shrink-0 group overflow-hidden">
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ShoppingBag size={80} strokeWidth={1} className="md:size-30" />
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent md:hidden" />
                        </div>

                        <div className="flex-1 flex flex-col h-full bg-white md:bg-slate-100 relative overflow-hidden">
                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-14 pb-32 md:pb-14">
                                <div className="block md:hidden mb-8">
                                    <h2 className="text-display font-display font-bold text-slate-950 uppercase tracking-tighter leading-[0.9] mb-4">
                                        {product.name}
                                    </h2>
                                </div>
                                <div className="hidden md:block mb-12">
                                    <h2 className="text-display font-display font-bold text-slate-950 uppercase tracking-tighter leading-[0.9] mb-6">
                                        {product.name}
                                    </h2>
                                    {product.description ? (
                                        <p className="text-body-lg font-body text-slate-400 uppercase tracking-widest leading-relaxed max-w-md">
                                            {product.description}
                                        </p>
                                    ) : null}
                                </div>

                                {product.description ? (
                                    <section className="md:hidden">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="h-px w-4 bg-rose-600 opacity-50" />
                                            <h3 className="text-[9px] font-black text-rose-600 uppercase tracking-[0.25em]">Descrição</h3>
                                        </div>
                                        <p className="text-body-sm font-body text-slate-600 leading-relaxed">
                                            {product.description}
                                        </p>
                                    </section>
                                ) : null}

                                <div className="space-y-12">
                                    {hasProductDiscount(discountPercent) && (
                                        <section className="rounded-xl border border-rose-100 bg-rose-50 p-6 flex items-center justify-between gap-6">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Promoção ativa</p>
                                                <p className="text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight mt-2">Desconto de {discountPercent}% aplicado automaticamente</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 line-through">{formatCurrency(basePrice)}</p>
                                                <p className="text-heading-2 font-mono font-bold text-rose-600 tracking-tighter">{formatCurrency(discountedBasePrice)}</p>
                                            </div>
                                        </section>
                                    )}

                                    {product.sizes && product.sizes.length > 0 && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="h-px w-4 bg-rose-600 opacity-50" />
                                                <h3 className="text-[9px] font-black text-rose-600 uppercase tracking-[0.25em]">Escolha o Tamanho</h3>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2.5">
                                                {product.sizes.map((size: any) => (
                                                    <button
                                                        key={size.name}
                                                        onClick={() => setSelectedSize(size)}
                                                        className={cn(
                                                            "p-4 rounded-xl border transition-all duration-500 flex items-center justify-between group relative overflow-hidden",
                                                            selectedSize?.name === size.name
                                                                ? "bg-slate-950 border-slate-900 shadow-xl shadow-slate-950/10"
                                                                : "bg-white border-slate-100 hover:border-slate-200"
                                                        )}
                                                    >
                                                        <div className="flex flex-col relative z-10 pl-2">
                                                            <span className={cn(
                                                                "font-display font-bold text-[16px] uppercase tracking-tight leading-none transition-colors",
                                                                selectedSize?.name === size.name ? "text-white" : "text-slate-950"
                                                            )}>{size.name}</span>
                                                            <span className={cn(
                                                                "text-[8px] font-black uppercase tracking-widest mt-1.5 transition-opacity",
                                                                selectedSize?.name === size.name ? "text-rose-500 opacity-100" : "text-slate-400 opacity-60"
                                                            )}>Seleção Premium</span>
                                                        </div>
                                                        <span className={cn(
                                                            "font-mono font-bold text-[16px] relative z-10 px-4 py-1.5 rounded-2xl transition-all",
                                                            selectedSize?.name === size.name ? "bg-white/10 text-rose-500" : "text-slate-950"
                                                        )}>{formatCurrency(size.price)}</span>
                                                        
                                                        {selectedSize?.name === size.name && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-600" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {product.addons && product.addons.length > 0 && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="h-px w-4 bg-rose-600 opacity-50" />
                                                <h3 className="text-[9px] font-black text-rose-600 uppercase tracking-[0.25em]">Turbine seu Pedido</h3>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2.5">
                                                {product.addons.map((addon: any) => {
                                                    const current = selectedAddons.find(a => a.name === addon.name);
                                                    return (
                                                        <div
                                                            key={addon.name}
                                                            className={cn(
                                                                "p-3.5 pr-4 rounded-xl border transition-all duration-500 flex items-center justify-between group",
                                                                current 
                                                                    ? "bg-slate-950 border-slate-900 shadow-xl shadow-slate-950/10" 
                                                                    : "bg-white border-slate-100 hover:border-slate-200"
                                                            )}
                                                        >
                                                            <div className="flex flex-col pl-2">
                                                                <span className={cn(
                                                                    "text-[13px] font-bold uppercase tracking-tight leading-tight transition-colors",
                                                                    current ? "text-white" : "text-slate-900"
                                                                )}>
                                                                    {addon.name}
                                                                </span>
                                                                <span className={cn(
                                                                    "font-mono font-bold text-[11px] mt-0.5 transition-colors",
                                                                    current ? "text-rose-500" : "text-rose-600"
                                                                )}>
                                                                    +{formatCurrency(addon.price)}
                                                                </span>
                                                            </div>

                                                            <div className={cn(
                                                                "flex items-center h-9 px-1 rounded-2xl transition-all duration-300",
                                                                current ? "bg-white/10" : "bg-slate-50 shadow-inner"
                                                            )}>
                                                                <button
                                                                    onClick={() => updateAddonQuantity(addon, -1)}
                                                                    className={cn(
                                                                        "w-7 h-7 flex items-center justify-center transition-colors",
                                                                        current ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-slate-900"
                                                                    )}
                                                                >
                                                                    <Minus size={12} />
                                                                </button>
                                                                <span className={cn(
                                                                    "w-7 text-center font-mono font-bold text-[13px] transition-colors",
                                                                    current ? "text-white" : "text-slate-900"
                                                                )}>
                                                                    {current?.quantity || 0}
                                                                </span>
                                                                <button
                                                                    onClick={() => updateAddonQuantity(addon, 1)}
                                                                    className={cn(
                                                                        "w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 font-bold",
                                                                        current ? "bg-rose-600 text-white" : "bg-slate-950 text-white"
                                                                    )}
                                                                >
                                                                    <Plus size={12} />
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
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="h-px w-4 bg-rose-600 opacity-50" />
                                                <h3 className="text-[9px] font-black text-rose-600 uppercase tracking-[0.25em]">Remover Itens</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {product.ingredients.map((ing: string) => (
                                                    <button
                                                        key={ing}
                                                        onClick={() => toggleRemoval(ing)}
                                                        className={cn(
                                                            "group relative px-4 py-2 rounded-2xl border transition-all duration-300 flex items-center gap-2.5",
                                                            removals.includes(ing)
                                                                ? "bg-rose-50 border-rose-100 text-rose-600"
                                                                : "bg-slate-50/50 border-slate-100 text-slate-500 hover:border-slate-200"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                                                            removals.includes(ing) ? "bg-rose-600 text-white" : "bg-slate-200 text-transparent"
                                                        )}>
                                                            <Check size={10} strokeWidth={4} />
                                                        </div>
                                                        <span className={cn(
                                                            "text-[10px] font-bold uppercase tracking-tight",
                                                            removals.includes(ing) && "line-through opacity-70"
                                                        )}>
                                                            {ing}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="h-px w-4 bg-rose-600 opacity-50" />
                                            <h3 className="text-[9px] font-black text-rose-600 uppercase tracking-[0.25em]">Observações</h3>
                                        </div>
                                        <textarea
                                            value={observations}
                                            onChange={(e) => setObservations(e.target.value)}
                                            placeholder="Ex: Sem cebola, carne bem passada..."
                                            className="w-full h-24 p-5 bg-slate-50 border border-slate-50 rounded-2xl focus:bg-white focus:border-rose-500/20 transition-all font-bold text-slate-950 text-[12px] outline-none placeholder:text-slate-300 resize-none uppercase"
                                        />
                                    </section>
                                </div>
                            </div>

                            <div className="p-4 bg-white border-t border-slate-50 flex items-center justify-center gap-3 sticky bottom-0 z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.03)] pb-8 md:pb-6">
                                {/* Seletor de Quantidade Estilo Imagem - Mais Fininho */}
                                <div className="flex items-center h-12 bg-slate-50/80 rounded-xl px-1.5 shadow-sm border border-slate-100">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="w-8 text-center text-base font-mono font-bold text-slate-950">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all text-base font-bold"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {/* Botão Principal Estilo Imagem - Mais Fininho e Vermelho Padrão */}
                                <button
                                    onClick={handleAdd}
                                    disabled={added || isOutOfStock}
                                    className={cn(
                                        "flex-1 h-12 rounded-xl flex items-center justify-between px-6 transition-all duration-500 active:scale-[0.96] relative overflow-hidden group",
                                        added ? "bg-emerald-500 text-white" : (isOutOfStock ? "bg-slate-400 cursor-not-allowed" : "bg-rose-600 text-white shadow-2xl shadow-rose-900/10")
                                    )}
                                >
                                    <div className="flex flex-col items-start leading-none relative z-10 text-left">
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-80 mb-0.5">
                                            {added ? "Item" : "Adicionar"}
                                        </span>
                                        <span className="text-[11px] font-black uppercase tracking-tighter">
                                            {added ? "Adicionado" : (isOutOfStock ? "Esgotado" : (editIndex !== null ? "Atualizar" : "No Carrinho"))}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="h-5 w-px bg-white/20" />
                                        <span className="text-[16px] font-mono font-bold tracking-tighter">
                                            {formatCurrency(totalPrice)}
                                        </span>
                                    </div>

                                    {/* Efeitos Visuais Premium */}
                                    {!added && !isOutOfStock && (
                                        <>
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10 z-0 opacity-20" />
                                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
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
