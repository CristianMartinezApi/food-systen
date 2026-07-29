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
import { formatCurrency, cn, normalizeAssetUrl } from "../../../../shared/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ProductModal } from "../../components/modals/ProductModal";
import { clampDiscountPercent, getProductDiscountedPrice, hasProductDiscount } from "../../../../shared/utils/product";
import { AdminPageHeader, SystemPanel } from "../../components/layout/AdminPageHeader";
import toast from "react-hot-toast";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const fetchProducts = async () => {
    try {
      const data = await api.get('/products');
      const normalized = Array.isArray(data)
        ? data.map((product: any) => ({
            ...product,
            image: normalizeAssetUrl(product?.image),
          }))
        : [];
      setProducts(normalized);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (error: any) {
      console.error("Erro ao excluir produto:", error);
      toast.error(error?.message || "Não foi possível excluir o produto.");
    }
  };

  return (
    <div className="ops-workspace products-theme space-y-3">
      <div className="products-hero">
        <AdminPageHeader
          eyebrow="Cardápio"
          title="Produtos"
          description="Gerencie itens, preços, estoque e disponibilidade."
          status={<span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{products.length} cadastrados</span>}
          actions={
          <button 
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-primary"
          >
             <Plus size={16} /> Novo produto
          </button>
          }
        />
      </div>

        {/* Filtros e Busca Moderno */}
        <SystemPanel className="products-filters flex flex-col gap-3 rounded-md p-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou categoria..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Filter size={15} /> Filtros
          </button>
        </SystemPanel>

        {/* Grid de Produtos Moderno */}
        {isLoading ? (
          <div className="py-32 flex flex-col items-center gap-6">
               <Loader2 className="animate-spin text-primary" size={40} />
               <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Sincronizando inventário...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                  transition={{ duration: 0.1 }}
                  key={product.id || idx}
                  className="product-card group flex h-full flex-col overflow-hidden rounded-md border border-slate-300 bg-white transition-colors hover:border-slate-400"
                >
                  {/* Image Container with Actions */}
                  <div className="relative aspect-square overflow-hidden bg-slate-50 shrink-0">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <Package size={80} strokeWidth={1} />
                      </div>
                    )}
                    
                    {/* Floating Category Tag */}
                    <div className="absolute top-3 left-3 sm:top-8 sm:left-8">
                        <span className="product-category-tag flex items-center gap-2 rounded-md border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] shadow-xl backdrop-blur-md sm:gap-3 sm:px-4">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="max-w-44 truncate">{product.category?.name || "Sem categoria"}</span>
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
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
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
