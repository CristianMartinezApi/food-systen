"use client";

import { useEffect, useState, useMemo } from "react";
import { 
    Search, 
    ShoppingCart, 
    ChevronLeft, 
    Plus, 
    Minus, 
    Trash2, 
    Send,
    LogOut,
    Utensils,
    LayoutGrid,
    CheckCircle2,
    Clock,
    X,
    MessageSquare,
    ShoppingBag,
    ChevronRight,
    Zap
} from "lucide-react";
import { api } from "../../../core/config/api";
import { formatCurrency, cn } from "../../../shared/utils";
import toast from "react-hot-toast";

type Table = {
    tableNumber: number;
    isOccupied: boolean;
    orders: any[];
};

type Product = {
    id: number;
    name: string;
    description?: string;
    price: number;
    categoryId: number;
    category?: { name: string };
    discountPercent?: number;
    addons?: any[];
    ingredients?: any[];
};

type Category = {
    id: number;
    name: string;
};

type CartItem = {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    observations?: string;
    addons?: any[];
    removals?: string[];
};

export default function WaiterPage() {
    const [step, setStep] = useState<"TABLES" | "MENU" | "CART">("TABLES");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [tables, setTables] = useState<Table[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | "ALL">("ALL");
    const [cart, setCart] = useState<CartItem[]>([]);
    
    // Modal state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [modalQty, setModalQty] = useState(1);
    const [modalObs, setModalObs] = useState("");
    const [modalSelectedAddons, setModalSelectedAddons] = useState<any[]>([]);
    const [modalSelectedRemovals, setModalSelectedRemovals] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [tablesRes, productsRes, categoriesRes] = await Promise.all([
                api.get("/tables"),
                api.get("/products"),
                api.get("/categories")
            ]);
            setTables(tablesRes);
            setProducts(productsRes.filter((p: any) => p.isActive));
            setCategories(categoriesRes);
        } catch (error) {
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    }

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategoryId === "ALL" || p.categoryId === selectedCategoryId;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategoryId]);

    const openProductModal = (product: Product) => {
        setSelectedProduct(product);
        setModalQty(1);
        setModalObs("");
        setModalSelectedAddons([]);
        setModalSelectedRemovals([]);
        setIsProductModalOpen(true);
    };

    const addProductFromModalToCart = () => {
        if (!selectedProduct) return;

        const basePrice = selectedProduct.price * (1 - (selectedProduct.discountPercent || 0) / 100);
        const addonsPrice = modalSelectedAddons.reduce((acc, addon) => acc + (addon.price || 0), 0);
        const finalPrice = basePrice + addonsPrice;

        const newCartItem: CartItem = {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            price: finalPrice,
            quantity: modalQty,
            observations: modalObs,
            addons: modalSelectedAddons,
            removals: modalSelectedRemovals
        };

        setCart(prev => [...prev, newCartItem]);
        
        setIsProductModalOpen(false);
        setSelectedProduct(null);
        toast.success(`${selectedProduct.name} adicionado ao carrinho`);
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleConfirmOrder = async () => {
        if (!selectedTable) return;
        if (cart.length === 0) {
            toast.error("Adicione itens ao pedido");
            return;
        }

        try {
            setSubmitting(true);
            
            const payloadItems = cart.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                observations: item.observations,
                addons: item.addons,
                removals: item.removals
            }));

            if (selectedTable.tableNumber === 0) {
                // Venda Direta / Balcão
                await api.post("/cashier/direct-sales", {
                    paymentMethod: "OPEN",
                    tableNumber: null,
                    items: payloadItems,
                    sendToKitchen: true,
                    customerName: `Para Viagem - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                });
            } else if (selectedTable.isOccupied && selectedTable.orders.length > 0) {
                const activeOrder = selectedTable.orders[0];
                await api.post(`/orders/${activeOrder.id}/items`, { items: payloadItems });
            } else {
                await api.post("/cashier/direct-sales", {
                    paymentMethod: "OPEN",
                    tableNumber: selectedTable.tableNumber,
                    items: payloadItems,
                    sendToKitchen: true,
                    customerName: `Mesa ${selectedTable.tableNumber}`
                });
            }

            toast.success("Pedido enviado com sucesso!");
            setCart([]);
            setSelectedTable(null);
            setStep("TABLES");
            loadData();
        } catch (error: any) {
            toast.error(error?.message || "Erro ao enviar pedido");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleAddon = (addon: any) => {
        setModalSelectedAddons(prev => {
            const exists = prev.find(a => a.name === addon.name);
            if (exists) return prev.filter(a => a.name !== addon.name);
            return [...prev, addon];
        });
    };

    const toggleRemoval = (ingredientName: string) => {
        setModalSelectedRemovals(prev => {
            if (prev.includes(ingredientName)) return prev.filter(i => i !== ingredientName);
            return [...prev, ingredientName];
        });
    };

    const handleLogout = () => {
        localStorage.removeItem("@FoodSystem:token");
        localStorage.removeItem("@FoodSystem:user");
        localStorage.removeItem("@FoodSystem:restaurant");
        window.location.href = "/login";
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <Utensils className="h-8 w-8 animate-bounce text-slate-900" />
            </div>
        );
    }

    return (
        <div className="ops-workspace flex min-h-[calc(100vh-6rem)] flex-col pb-20">
            {/* Header */}
            <header className="ops-panel sticky top-0 z-20 flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-3">
                    {step !== "TABLES" && (
                        <button 
                            onClick={() => {
                                if (step === "CART") setStep("MENU");
                                else if (step === "MENU") setStep("TABLES");
                            }}
                            className="rounded bg-slate-100 p-2"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    )}
                    <h1 className="text-lg font-semibold text-slate-900">
                        {step === "TABLES" && "Garçom - Mesas"}
                        {step === "MENU" && (selectedTable?.tableNumber === 0 ? "Venda Balcão" : `Mesa ${selectedTable?.tableNumber}`)}
                        {step === "CART" && "Carrinho"}
                    </h1>
                </div>
                {step === "TABLES" && (
                    <button 
                        onClick={handleLogout}
                        className="rounded bg-slate-100 p-2 text-red-500"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                )}
            </header>

            <main className="flex-1 py-3">
                {step === "TABLES" && (
                    <div className="space-y-6">
                        {/* Opção Balcão / Para Viagem */}
                        <button 
                            onClick={() => {
                                setSelectedTable({ tableNumber: 0, isOccupied: false, orders: [] });
                                setStep("MENU");
                            }}
                            className="group flex w-full items-center justify-between rounded-md border border-slate-400 bg-white p-4 transition-colors hover:bg-slate-50"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-900">
                                    <ShoppingBag className="text-white" size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Venda Balcão / Viagem</h3>
                                        <Zap size={14} className="text-amber-500 fill-amber-500" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sem vínculo com mesa</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {tables.map((table) => (
                            <button
                                key={table.tableNumber}
                                onClick={() => {
                                    setSelectedTable(table);
                                    setStep("MENU");
                                }}
                                className={cn(
                                    "relative flex flex-col items-center justify-center rounded-md border p-4 transition-colors active:bg-slate-100",
                                    table.isOccupied 
                                        ? "border-red-100 bg-red-50 text-red-700 shadow-sm"
                                        : "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
                                )}
                            >
                                <span className="text-3xl font-black">
                                    {String(table.tableNumber).padStart(2, "0")}
                                </span>
                                <span className="mt-1 text-xs font-bold uppercase tracking-wider">
                                    {table.isOccupied ? "Ocupada" : "Livre"}
                                </span>
                                {table.isOccupied && (
                                    <div className="absolute right-2 top-2">
                                        <Clock className="h-4 w-4 opacity-50" />
                                    </div>
                                )}
                            </button>
                        ))}
                        </div>
                    </div>
                )}

                {step === "MENU" && (
                    <div className="space-y-4">
                        {/* Search & Categories */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Buscar produto..."
                                    className="ops-field pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                <button
                                    onClick={() => setSelectedCategoryId("ALL")}
                                    className={cn(
                                        "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all",
                                        selectedCategoryId === "ALL" 
                                            ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" 
                                            : "bg-white text-slate-600 shadow-sm"
                                    )}
                                >
                                    Todos
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={cn(
                                            "whitespace-nowrap rounded px-4 py-2 text-sm font-semibold transition-colors",
                                            selectedCategoryId === cat.id 
                                                ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" 
                                                : "bg-white text-slate-600 shadow-sm"
                                        )}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Products List */}
                        <div className="grid gap-3">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => openProductModal(product)}
                                    className="flex items-center justify-between rounded-md border border-slate-300 bg-white p-3 transition-colors active:bg-slate-50"
                                >
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-slate-900 group-active:text-primary transition-colors">{product.name}</div>
                                        {product.description && <div className="text-[10px] text-slate-400 line-clamp-1">{product.description}</div>}
                                        <div className="text-sm font-semibold text-emerald-600 mt-1">{formatCurrency(product.price)}</div>
                                    </div>
                                    <div className="rounded-xl bg-slate-900 p-2 text-white ml-4">
                                        <Plus className="h-5 w-5" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === "CART" && (
                    <div className="space-y-4">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <ShoppingCart className="mb-4 h-16 w-16 opacity-20" />
                                <p className="font-medium">O carrinho está vazio</p>
                            </div>
                        ) : (
                            <>
                                <div className="ops-panel divide-y divide-slate-200">
                                    {cart.map((item, idx) => (
                                        <div key={`${item.productId}-${idx}`} className="flex flex-col p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-900 uppercase">{item.name}</div>
                                                    <div className="text-[10px] text-slate-500">
                                                        {item.addons?.map(a => `+ ${a.name}`).join(", ")}
                                                        {item.removals?.length ? ` | Sem: ${item.removals.join(", ")}` : ""}
                                                    </div>
                                                    <div className="text-sm text-slate-500 mt-1">{formatCurrency(item.price)}</div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center rounded-xl bg-slate-100 p-1">
                                                        <button 
                                                            onClick={() => updateQuantity(idx, -1)}
                                                            className="rounded-lg p-1 text-slate-600 hover:bg-white"
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </button>
                                                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                                                        <button 
                                                            onClick={() => updateQuantity(idx, 1)}
                                                            className="rounded-lg p-1 text-slate-600 hover:bg-white"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {item.observations && (
                                                <div className="mt-2 text-[11px] text-amber-600 flex items-center gap-1 bg-amber-50 p-2 rounded-lg">
                                                    <MessageSquare className="h-3 w-3" />
                                                    <strong>Obs:</strong> {item.observations}
                                                </div>
                                            )}

                                            <div className="mt-2 text-right font-bold text-slate-900 border-t border-slate-50 pt-2">
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-md bg-slate-900 p-4 text-white">
                                    <div className="flex items-center justify-between text-lg font-bold">
                                        <span>Total do Pedido</span>
                                        <span>{formatCurrency(cartTotal)}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* Bottom Nav / Actions */}
            <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                {step === "TABLES" ? (
                    <div className="flex items-center justify-center gap-8 text-slate-400">
                        <div className="flex flex-col items-center gap-1 text-slate-900">
                            <LayoutGrid className="h-6 w-6" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Mesas</span>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-100" />
                        <div className="flex flex-col items-center gap-1 opacity-50">
                            <Utensils className="h-6 w-6" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Produtos</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setStep(step === "CART" ? "MENU" : "CART")}
                            className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-900"
                        >
                            <ShoppingCart className="h-6 w-6" />
                            {cart.length > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-4 ring-white">
                                    {cart.length}
                                </span>
                            )}
                        </button>
                        
                        {step === "CART" ? (
                            <button
                                disabled={submitting || cart.length === 0}
                                onClick={handleConfirmOrder}
                                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-lg font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <>
                                        <Send className="h-5 w-5" />
                                        <span>Enviar Pedido</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={() => setStep("CART")}
                                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-lg font-bold text-white transition-all active:scale-95"
                            >
                                <span>Ver Carrinho</span>
                                <span className="text-sm opacity-80">({formatCurrency(cartTotal)})</span>
                            </button>
                        )}
                    </div>
                )}
            </footer>

            {/* Product Modal */}
            <div className={cn(
                "fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 transition-all duration-300",
                isProductModalOpen ? "visible" : "invisible"
            )}>
                <div 
                    className={cn(
                        "absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300",
                        isProductModalOpen ? "opacity-100" : "opacity-0"
                    )}
                    onClick={() => setIsProductModalOpen(false)}
                />
                
                <div className={cn(
                    "relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden transition-transform duration-300 shadow-2xl max-h-[90vh] flex flex-col",
                    isProductModalOpen ? "translate-y-0" : "translate-y-full sm:scale-95 sm:translate-y-0"
                )}>
                    <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedProduct?.name}</h2>
                            <p className="text-sm font-bold text-emerald-600">{formatCurrency(selectedProduct?.price || 0)}</p>
                        </div>
                        <button 
                            onClick={() => setIsProductModalOpen(false)}
                            className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                        {/* Removals */}
                        {selectedProduct?.ingredients && selectedProduct.ingredients.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Retirar Ingredientes?</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedProduct.ingredients.map((ing: any) => (
                                        <button
                                            key={ing}
                                            onClick={() => toggleRemoval(ing)}
                                            className={cn(
                                                "flex items-center gap-2 p-3 rounded-2xl border-2 text-sm font-bold transition-all",
                                                modalSelectedRemovals.includes(ing)
                                                    ? "border-red-500 bg-red-50 text-red-600"
                                                    : "border-slate-100 bg-white text-slate-600"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded flex items-center justify-center border",
                                                modalSelectedRemovals.includes(ing) ? "bg-red-500 border-red-500" : "border-slate-300"
                                            )}>
                                                {modalSelectedRemovals.includes(ing) && <X className="h-3 w-3 text-white" />}
                                            </div>
                                            Tirar {ing}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Addons */}
                        {selectedProduct?.addons && selectedProduct.addons.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Adicionais</h3>
                                <div className="space-y-2">
                                    {selectedProduct.addons.map((addon: any) => (
                                        <button
                                            key={addon.name}
                                            onClick={() => toggleAddon(addon)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                                modalSelectedAddons.find(a => a.name === addon.name)
                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-100 bg-white text-slate-600"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full flex items-center justify-center border",
                                                    modalSelectedAddons.find(a => a.name === addon.name) ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                                                )}>
                                                    {modalSelectedAddons.find(a => a.name === addon.name) && <CheckCircle2 className="h-4 w-4 text-white" />}
                                                </div>
                                                <span className="font-bold">{addon.name}</span>
                                            </div>
                                            <span className="text-sm font-black">+{formatCurrency(addon.price)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Observations */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Observações do Item</h3>
                            <textarea
                                placeholder="Alguma observação? (ex: ponto da carne, sem cebola...)"
                                className="w-full h-24 rounded-[2rem] border-2 border-slate-100 bg-slate-50 p-6 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none resize-none"
                                value={modalObs}
                                onChange={(e) => setModalObs(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-white border-t border-slate-50 flex items-center gap-4">
                        <div className="flex items-center rounded-2xl bg-slate-100 p-1">
                            <button 
                                onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm active:scale-90 transition-all font-bold"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-12 text-center font-black text-lg">{modalQty}</span>
                            <button 
                                onClick={() => setModalQty(modalQty + 1)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm active:scale-90 transition-all font-bold"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <button
                            onClick={addProductFromModalToCart}
                            className="flex-1 h-12 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl shadow-slate-950/20"
                        >
                            Adicionar ao Pedido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
