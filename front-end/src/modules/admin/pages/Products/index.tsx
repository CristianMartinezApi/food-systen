import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Loader2,
  Package,
  CheckCircle2,
  XCircle,
  Tag
} from "lucide-react";
import { api } from "../../../../core/config/api";
import { formatCurrency, cn } from "../../../../shared/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ProductModal } from "../../components/modals/ProductModal";
import { gsap } from "gsap";
import { clampDiscountPercent, getProductDiscountedPrice, hasProductDiscount } from "../../../../shared/utils/product";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const fetchProducts = async () => {
    try {
      const data = await api.get('/products');
      setProducts(data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (isLoading || !rootRef.current || hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".products-hero", { y: -18, opacity: 0, duration: 0.7 })
        .from(".products-filters", { y: 24, opacity: 0, duration: 0.8 }, "-=0.25");
    }, rootRef);

    return () => ctx.revert();
  }, [isLoading]);

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
    }
  };

  return (
    <div ref={rootRef} className="p-4 sm:p-6 md:p-8">
      <div className="products-hero flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Inventário</h1>
            <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-2">Curadoria e gestão estratégica do seu catálogo gastronômico.</p>
          </div>
          <button 
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="h-10 sm:h-12 md:h-16 px-4 sm:px-6 md:px-10 bg-slate-950 text-white rounded-2xl font-body font-bold text-[11px] sm:text-label uppercase tracking-[0.06em] flex items-center justify-center gap-2 sm:gap-3 shadow-2xl shadow-slate-950/20 hover:bg-primary transition-all whitespace-nowrap active:scale-95 w-full sm:w-auto"
          >
             <Plus size={20} /> NOVO PRODUTO
          </button>
        </div>

        {/* Filtros e Busca Moderno */}
        <div className="products-filters bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[3rem] border border-slate-50 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-6 mb-8 sm:mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou categoria..."
              className="w-full h-10 sm:h-12 md:h-16 pl-11 sm:pl-14 md:pl-16 pr-4 sm:pr-6 bg-slate-50 border-transparent rounded-2xl sm:rounded-3xl focus:bg-white focus:ring-2 focus:ring-slate-950/5 transition-all font-body font-medium text-slate-600 text-[12px] sm:text-label uppercase tracking-[0.04em]"
            />
          </div>
          <button className="h-10 sm:h-12 md:h-16 px-4 sm:px-6 md:px-8 rounded-2xl sm:rounded-3xl border border-slate-100 text-[11px] sm:text-label font-body font-bold text-slate-400 uppercase tracking-[0.06em] flex items-center justify-center gap-2 sm:gap-3 hover:bg-slate-50 transition-all">
            <Filter size={16} /> Filtragem
          </button>
        </div>

        {/* Grid de Produtos Moderno */}
        {isLoading ? (
          <div className="py-32 flex flex-col items-center gap-6">
               <Loader2 className="animate-spin text-primary" size={40} />
               <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Sincronizando inventário...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, idx) => (
                (() => {
                  const discountPercent = clampDiscountPercent(product.discountPercent);
                  const salePrice = getProductDiscountedPrice(product.price, discountPercent);
                  const isPromotional = hasProductDiscount(discountPercent);

                  return (
                <motion.div
                  layout
                  initial={false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  key={product.id || idx}
                  className="product-card bg-white rounded-2xl sm:rounded-[3.5rem] border border-slate-50 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 group flex flex-col h-full"
                >
                  {/* Image Container with Actions */}
                  <div className="relative aspect-square overflow-hidden bg-slate-50 shrink-0">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-out" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <Package size={80} strokeWidth={1} />
                      </div>
                    )}
                    
                    {/* Floating Category Tag */}
                    <div className="absolute top-3 left-3 sm:top-8 sm:left-8">
                        <span className="bg-white/95 backdrop-blur-md px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] font-body font-bold uppercase tracking-[0.2em] text-slate-950 shadow-2xl border border-white/50 flex items-center gap-2 sm:gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {product.category?.name || "CURADORIA"}
                        </span>
                        {isPromotional && (
                          <div className="mt-2 sm:mt-3 inline-flex items-center gap-2 rounded-xl sm:rounded-2xl bg-rose-500 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-rose-500/20">
                            <span>PROMOÇÃO</span>
                            <span>-{discountPercent}%</span>
                          </div>
                        )}
                    </div>

                    {/* Hover Controls */}
                      <div className="absolute inset-0 bg-slate-950/35 md:bg-slate-950/60 backdrop-blur-[1px] md:backdrop-blur-[2px] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500 flex items-end md:items-center justify-center p-4 sm:p-10">
                          <div className="flex gap-2 sm:gap-4 translate-y-0 md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-500">
                               <button 
                                  onClick={() => {
                                      setSelectedProduct(product);
                                      setIsModalOpen(true);
                                  }}
                               className="w-11 h-11 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-950 hover:bg-primary hover:text-white transition-all shadow-2xl active:scale-95 group/btn"
                               >
                                  <Edit2 size={24} className="group-hover/btn:rotate-12 transition-transform" />
                                </button>
                               <button 
                                  onClick={() => handleDelete(product.id)}
                               className="w-11 h-11 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-2xl active:scale-95 group/btn"
                               >
                                  <Trash2 size={24} className="group-hover/btn:rotate-12 transition-transform" />
                               </button>
                          </div>
                    </div>
                  </div>

                  {/* Product Info - Strategic Layout */}
                  <div className="p-4 sm:p-6 md:p-10 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-base sm:text-lg md:text-xl font-display font-bold text-slate-950 uppercase tracking-tight leading-tight line-clamp-2 flex-1 pr-4">
                        {product.name}
                      </h3>
                      <div className={cn(
                        "w-3 h-3 rounded-full mt-2 ring-4",
                        product.isActive !== false ? "bg-emerald-500 ring-emerald-500/10 animate-pulse" : "bg-slate-300 ring-slate-100"
                      )} />
                    </div>

                    <p className="text-[11px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-wider line-clamp-2 leading-relaxed mb-5 sm:mb-8 flex-1">
                      {product.description || "Composição gastronômica exclusiva, refinada com ingredientes de procedência selecionada."}
                    </p>
                    
                    <div className="flex items-center justify-between pt-5 sm:pt-8 border-t border-slate-50">
                       <div>
                          <p className="text-[10px] font-body font-bold text-slate-300 uppercase tracking-[0.2em] mb-1">Preço Sugerido</p>
                          <div className="flex flex-col gap-1">
                            {isPromotional ? (
                              <>
                                <p className="text-[10px] font-body font-bold text-slate-300 uppercase tracking-widest line-through">
                                  {formatCurrency(product.price)}
                                </p>
                                <p className="text-heading-2 font-mono font-bold text-primary tracking-tighter leading-none">
                                  {formatCurrency(salePrice)}
                                </p>
                              </>
                            ) : (
                              <p className="text-heading-2 font-mono font-bold text-slate-950 tracking-tighter leading-none">
                                {formatCurrency(product.price)}
                              </p>
                            )}
                          </div>
                          {product.trackStock && (
                            <p className={cn(
                              "text-[10px] font-body font-bold uppercase tracking-widest mt-2",
                              product.stockQuantity <= 5 ? "text-rose-500" : "text-emerald-500"
                            )}>
                              Estoque: {product.stockQuantity} un
                            </p>
                          )}
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-body font-bold text-slate-300 uppercase tracking-[0.2em] mb-1">Status Ativo</p>
                          <span className={cn(
                            "text-[10px] font-body font-black uppercase tracking-widest px-3 py-1 rounded-lg",
                            product.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                          )}>
                            {product.isActive !== false ? "ATIVO" : "PAUSADO"}
                          </span>
                       </div>
                    </div>
                  </div>
                </motion.div>
                  );
                })()
              ))}
            </AnimatePresence>
          </div>
        )}

        <ProductModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchProducts}
          product={selectedProduct}
        />
    </div>
  );
}
