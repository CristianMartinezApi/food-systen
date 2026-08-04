import { useState, useMemo, useEffect, useRef } from "react";
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
    const modalHistoryActiveRef = useRef(false);
    const closingFromPopRef = useRef(false);

    const initialSize = useMemo(() => {
        if (!product?.sizes || !initialData?.variation) return product?.sizes?.[0] || null;
        return product.sizes.find((s: any) => s.name === initialData.variation) || product.sizes[0];
    }, [product, initialData]);

    const [selectedSize, setSelectedSize] = useState<any>(null);
    const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
    const [selectedGuidedOptions, setSelectedGuidedOptions] = useState<Record<string, any[]>>({});
    const [removals, setRemovals] = useState<string[]>([]);
    const [observations, setObservations] = useState("");

    const addItem = useCartStore((state: any) => state.addItem);
    const updateItem = useCartStore((state: any) => state.updateItem);

    const guidedGroups = useMemo(() => {
        const configured = Array.isArray(product?.guidedAssemblyConfig)
            ? product.guidedAssemblyConfig
            : Array.isArray(product?.category?.guidedAssemblyConfig)
                ? product.category.guidedAssemblyConfig
                : [];
        return configured.filter((group: any) => group?.name);
    }, [product]);

    useEffect(() => {
        if (isOpen && product) {
            const genericAddons = Array.isArray(initialData?.addons)
                ? initialData.addons.filter((item: any) => !item.step)
                : [];

            const initialGuidedSelections = Array.isArray(initialData?.guidedAssemblySelections)
                ? initialData.guidedAssemblySelections
                : [];

            const initialState: Record<string, any[]> = {};
            guidedGroups.forEach((group: any) => {
                const groupId = String(group.id || group.name);
                const selection = initialGuidedSelections.find((item: any) => String(item.groupId) === groupId);
                const optionIds = Array.isArray(selection?.optionIds)
                    ? selection.optionIds
                    : [];
                initialState[groupId] = (group.options || []).filter((option: any) => optionIds.includes(option.id || option.name));
            });

            setQuantity(initialData?.quantity || 1);
            // Só deixa pré-selecionado se estiver editando; senão deixa vazio
            setSelectedSize(initialData ? initialSize : null);
            setSelectedAddons(genericAddons);
            setSelectedGuidedOptions(initialState);
            setRemovals(initialData?.removals || []);
            setObservations(initialData?.observations || "");
        }
    }, [isOpen, product, initialData, initialSize, guidedGroups]);

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

    // Integra o modal ao histórico do navegador para que o botão voltar no celular feche o modal.
    useEffect(() => {
        if (!isOpen || typeof window === "undefined") {
            return;
        }

        window.history.pushState(
            {
                ...(window.history.state || {}),
                __fsProductModalOpen: true,
            },
            ""
        );
        modalHistoryActiveRef.current = true;

        const handlePopState = () => {
            closingFromPopRef.current = true;
            modalHistoryActiveRef.current = false;
            onClose();
            window.setTimeout(() => {
                closingFromPopRef.current = false;
            }, 0);
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [isOpen, onClose]);

    const handleRequestClose = () => {
        if (typeof window !== "undefined" && modalHistoryActiveRef.current && !closingFromPopRef.current) {
            modalHistoryActiveRef.current = false;
            window.history.back();
        }
        onClose();
    };

    // Calcula o menor preço entre os tamanhos
    const minSizePrice = useMemo(() => {
        if (!product?.sizes || product.sizes.length === 0) return null;
        return Math.min(...product.sizes.map((s: any) => s.price || 0));
    }, [product?.sizes]);

    // Define o preço base: se tem tamanhos, usa o menor; senão usa o preço do produto
    const basePrice = useMemo(() => {
        if (!product) return 0;
        if (selectedSize) return selectedSize.price;
        if (minSizePrice !== null) return minSizePrice;
        return product.price || 0;
    }, [selectedSize, product, minSizePrice]);

    // Indica se está mostrando "a partir de..."
    const isShowingStartingFrom = useMemo(() => {
        return minSizePrice !== null && !selectedSize;
    }, [minSizePrice, selectedSize]);

    const isGuidedProduct = guidedGroups.length > 0;

    const selectedCustomizationItems = useMemo(() => {
        return Object.values(selectedGuidedOptions).flat();
    }, [selectedGuidedOptions]);

    const addonsTotal = useMemo(() => {
        const addonTotal = selectedAddons.reduce((acc, addon) => acc + ((addon.price || 0) * (addon.quantity || 1)), 0);
        const customizationTotal = selectedCustomizationItems.reduce((acc, addon) => acc + ((addon.price || 0) * (addon.quantity || 1)), 0);
        return addonTotal + customizationTotal;
    }, [selectedAddons, selectedCustomizationItems]);

    const discountPercent = clampDiscountPercent(product?.discountPercent);
    const discountedBasePrice = getProductDiscountedPrice(basePrice, discountPercent);
    const unitPrice = discountedBasePrice + addonsTotal;
    const totalPrice = unitPrice * quantity;

const updateGuidedOptionQuantity = (group: any, option: any, delta: number) => {
        const groupId = String(group.id || group.name);
        const current = selectedGuidedOptions[groupId] || [];
        const maxSelections = Number(group.maxSelections ?? 1);
        
        // Contar quantas vezes esta opção foi selecionada
        const optionCount = current.filter((item: any) => item.name === option.name).length;
        const newCount = optionCount + delta;
        
        // Se newCount <= 0, remover todas as instâncias
        if (newCount <= 0) {
            const updatedCurrent = current.filter((item: any) => item.name !== option.name);
            setSelectedGuidedOptions(prev => ({ ...prev, [groupId]: updatedCurrent }));
            return;
        }
        
        // Se newCount > maxSelections, não permite
        if (newCount > maxSelections) {
            return;
        }
        
        // Se delta é positivo e newCount é válido, adicionar uma instância
        if (delta > 0) {
            setSelectedGuidedOptions(prev => ({ ...prev, [groupId]: [...current, option] }));
        } else if (delta < 0) {
            // Se delta é negativo, remover UMA instância
            const index = current.findIndex((item: any) => item.name === option.name);
            if (index > -1) {
                const updatedCurrent = [...current];
                updatedCurrent.splice(index, 1);
                setSelectedGuidedOptions(prev => ({ ...prev, [groupId]: updatedCurrent }));
            }
        }
    };

    const handleAdd = () => {
        if (!product) return;

        // Validar se tem tamanhos e nenhum foi selecionado
        if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
            alert("Selecione um tamanho para continuar.");
            return;
        }

        const selectedCustomization = Object.entries(selectedGuidedOptions).flatMap(([groupId, options]) =>
            (options || []).map((option: any) => ({ ...option, groupId, step: groupId }))
        );

        const guidedAssemblySelections = guidedGroups
            .map((group: any) => {
                const groupId = String(group.id || group.name);
                const selected = selectedGuidedOptions[groupId] || [];
                return {
                    groupId,
                    optionIds: selected.map((option: any) => option.id || option.name)
                };
            })
            .filter((selection: any) => selection.optionIds.length > 0);

        const customizationSummary = isGuidedProduct
            ? guidedGroups
                .map((group: any) => {
                    const groupId = String(group.id || group.name);
                    const selected = selectedGuidedOptions[groupId] || [];
                    return selected.length > 0 ? `${group.name}: ${selected.map((item: any) => item.name).join(', ')}` : null;
                })
                .filter(Boolean)
                .join(' | ')
            : "";

        const itemData = {
            productId: product.id,
            name: product.name,
            price: unitPrice,
            quantity: quantity,
            variation: selectedSize?.name,
            addons: [...selectedAddons, ...selectedCustomization],
            removals: removals,
            observations: [observations, customizationSummary].filter(Boolean).join(' | '),
            customization: selectedCustomization,
            guidedAssemblySelections,
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
            handleRequestClose();
            if (editIndex === null) {
                setQuantity(1);
                setSelectedSize(null);
                setSelectedAddons([]);
                setSelectedGuidedOptions({});
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
                        onClick={handleRequestClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative z-10 flex h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-none bg-slate-100 shadow-[0_-15px_60px_rgba(15,23,42,0.15)] md:h-[min(90vh,900px)] md:max-w-6xl md:flex-row md:rounded-3xl md:shadow-[0_35px_80px_rgba(15,23,42,0.28)]"
                    >
                        <button
                            onClick={handleRequestClose}
                            className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200/50 bg-white/95 text-slate-900 shadow-lg transition-colors hover:bg-slate-950 hover:text-white md:right-8 md:top-8 md:h-14 md:w-14 md:rounded-2xl md:bg-slate-100/95 md:shadow-xl"
                        >
                            <X size={18} className="md:size-6 group-hover:rotate-90 transition-transform duration-500" />
                        </button>

                        <div className="relative w-full md:w-1/2 h-[35vh] md:h-full bg-slate-200 shrink-0 group overflow-hidden">
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    loading="lazy"
                                    decoding="async"
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
                                            <div className="grid grid-cols-1 gap-2">
                                                {product.sizes.map((size: any) => (
                                                    <button
                                                        key={size.name}
                                                        onClick={() => setSelectedSize(size)}
                                                        className={cn(
                                                            "px-3 py-2 rounded-xl border transition-all duration-500 flex items-center justify-between group relative overflow-hidden",
                                                            selectedSize?.name === size.name
                                                                ? "bg-slate-950 border-slate-900 shadow-xl shadow-slate-950/10"
                                                                : "bg-white border-slate-100 hover:border-slate-200"
                                                        )}
                                                    >
                                                        <div className="flex flex-col relative z-10 pl-1">
                                                            <span className={cn(
                                                                "font-display font-bold text-[14px] uppercase tracking-tight leading-tight transition-colors",
                                                                selectedSize?.name === size.name ? "text-white" : "text-slate-950"
                                                            )}>{size.name}</span>
                                                        </div>
                                                        <span className={cn(
                                                            "font-mono font-bold text-[13px] relative z-10 px-3 py-1 rounded-2xl transition-all",
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

                                    {isGuidedProduct && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="h-px w-4 bg-rose-600 opacity-50" />
                                                <h3 className="text-[9px] font-black text-rose-600 uppercase tracking-[0.25em]">Monte sua seleção</h3>
                                            </div>
                                            <div className="space-y-5">
                                                {guidedGroups.map((group: any, idx: number) => {
                                                    const groupId = String(group.id || group.name);
                                                    const selected = selectedGuidedOptions[groupId] || [];
                                                    const minSelections = Number(group.minSelections ?? 0);
                                                    const maxSelections = Number(group.maxSelections ?? 1);
                                                    const isValid = selected.length >= minSelections && selected.length <= maxSelections;
                                                    return (
                                                        <div key={groupId} className="space-y-4 rounded-xl border-2 border-slate-100 bg-white p-4">
                                                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                                                <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xs">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">{group.name}</p>
                                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                        {minSelections === maxSelections ? `Escolha ${minSelections} ${minSelections === 1 ? 'opção' : 'opções'}` : `Mínimo ${minSelections} • Máximo ${maxSelections}`}
                                                                    </p>
                                                                </div>
                                                                {isValid && <div className="text-emerald-600 text-xs">✓</div>}
                                                            </div>
                                                            <div className="space-y-2.5">
                                                                {(group.options || []).map((option: any) => {
                                                                    const optionCount = selected.filter((item: any) => item.name === option.name).length;
                                                                    const isSelected = optionCount > 0;
                                                                    const canAdd = selected.length < maxSelections && optionCount < maxSelections;
                                                                    return (
                                                                        <div
                                                                            key={option.name}
                                                                            className={cn(
                                                                                'p-3 rounded-xl border transition-all duration-300 flex items-center justify-between group',
                                                                                isSelected ? 'bg-slate-950 border-slate-900 shadow-lg shadow-slate-950/10' : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                                                            )}
                                                                        >
                                                                            <div className="flex flex-col flex-1">
                                                                                <span className={cn(
                                                                                    'text-[12px] font-bold uppercase tracking-tight transition-colors',
                                                                                    isSelected ? 'text-white' : 'text-slate-900'
                                                                                )}>
                                                                                    {option.name}
                                                                                </span>
                                                                                {option.price > 0 && (
                                                                                    <span className={cn(
                                                                                        'font-mono font-bold text-[10px] mt-0.5 transition-colors',
                                                                                        isSelected ? 'text-rose-400' : 'text-emerald-600'
                                                                                    )}>
                                                                                        +{formatCurrency(option.price)}
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <div className={cn(
                                                                                'flex items-center h-8 px-1 rounded-2xl transition-all duration-300 gap-0.5 ml-3',
                                                                                isSelected ? 'bg-white/10' : 'bg-slate-100 shadow-inner'
                                                                            )}>
                                                                                <button
                                                                                    onClick={() => updateGuidedOptionQuantity(group, option, -1)}
                                                                                    disabled={!isSelected}
                                                                                    className={cn(
                                                                                        'w-6 h-6 flex items-center justify-center rounded transition-colors active:scale-90',
                                                                                        isSelected ? 'text-white/60 hover:text-white' : 'text-slate-300 cursor-not-allowed'
                                                                                    )}
                                                                                >
                                                                                    <Minus size={11} strokeWidth={3} />
                                                                                </button>
                                                                                <span className={cn(
                                                                                    'w-6 text-center font-mono font-bold text-[11px] transition-colors',
                                                                                    isSelected ? 'text-white' : 'text-slate-600'
                                                                                )}>
                                                                                    {optionCount}
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => updateGuidedOptionQuantity(group, option, 1)}
                                                                                    disabled={!canAdd}
                                                                                    className={cn(
                                                                                        'w-6 h-6 rounded flex items-center justify-center transition-all active:scale-90 font-bold',
                                                                                        canAdd
                                                                                            ? isSelected ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-950 text-white hover:bg-slate-800'
                                                                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                                                                    )}
                                                                                >
                                                                                    <Plus size={11} strokeWidth={3} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {selected.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                                                                    {(() => {
                                                                        const grouped: Record<string, { item: any; count: number }> = {};
                                                                        selected.forEach((item: any) => {
                                                                            if (!grouped[item.name]) {
                                                                                grouped[item.name] = { item, count: 0 };
                                                                            }
                                                                            grouped[item.name].count++;
                                                                        });
                                                                        return Object.entries(grouped).map(([name, { item, count }]) => (
                                                                            <div key={name} className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                                                                                <span className="text-[9px] font-black text-rose-700 uppercase tracking-tight">
                                                                                    {count > 1 ? `${count}x ${item.name}` : item.name}
                                                                                </span>
                                                                                {item.price > 0 && <span className="text-[8px] font-mono font-bold text-emerald-600">+{formatCurrency(item.price * count)}</span>}
                                                                            </div>
                                                                        ));
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}

                                    {product.addons && product.addons.length > 0 && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="h-px w-4 bg-rose-600 opacity-50" />
                                                <h3 className="text-[9px] font-black text-rose-600 uppercase tracking-[0.25em]">Adicionais</h3>
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
                                            className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-5 text-[12px] font-bold uppercase text-slate-950 outline-none transition-colors placeholder:text-slate-300 focus:border-rose-500/20 focus:bg-white"
                                        />
                                    </section>

                                    {/* Resumo de Preço */}
                                    <section className="space-y-3 rounded-xl border-2 border-slate-100 bg-linear-to-br from-slate-50 to-white p-5">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Resumo do Preço</p>
                                        
                                        <div className="space-y-2 text-sm">
                                            {/* Preço Base */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                                                    {isShowingStartingFrom ? 'A partir de' : selectedSize ? `${selectedSize.name} (Base)` : 'Preço Base'}
                                                </span>
                                                <span className="text-[11px] font-mono font-bold text-slate-900">
                                                    {formatCurrency(basePrice)}
                                                </span>
                                            </div>

                                            {/* Desconto se houver */}
                                            {hasProductDiscount(discountPercent) && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-tight">
                                                        Desconto -{discountPercent}%
                                                    </span>
                                                    <span className="text-[11px] font-mono font-bold text-rose-600">
                                                        -{formatCurrency(basePrice - discountedBasePrice)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Opções Guiadas */}
                                            {selectedCustomizationItems.length > 0 && (
                                                <div>
                                                    {selectedCustomizationItems.map((item: any) => (
                                                        <div key={item.id || item.name} className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                                                                +{item.name}
                                                            </span>
                                                            <span className="text-[11px] font-mono font-bold text-emerald-600">
                                                                +{formatCurrency(item.price || 0)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Adicionais */}
                                            {selectedAddons.length > 0 && (
                                                <div>
                                                    {selectedAddons.map((addon: any) => (
                                                        <div key={addon.name} className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                                                                +{addon.name} {addon.quantity && addon.quantity > 1 ? `(×${addon.quantity})` : ''}
                                                            </span>
                                                            <span className="text-[11px] font-mono font-bold text-emerald-600">
                                                                +{formatCurrency((addon.price || 0) * (addon.quantity || 1))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Divisor */}
                                            <div className="h-px bg-slate-200 my-2" />

                                            {/* Total */}
                                            <div className="flex items-center justify-between bg-linear-to-r from-slate-950/5 to-rose-600/5 p-3 rounded-xl border border-slate-100">
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
                                                    Valor Unitário
                                                </span>
                                                <span className="text-[14px] font-mono font-black text-slate-950">
                                                    {formatCurrency(unitPrice)}
                                                </span>
                                            </div>
                                        </div>
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
                                    <span className="relative z-10 text-left text-[11px] font-black uppercase tracking-tight">
                                        {added ? "Adicionado" : (isOutOfStock ? "Produto indisponível" : (editIndex !== null ? "Atualizar item" : "Adicionar ao carrinho"))}
                                    </span>
                                    
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
