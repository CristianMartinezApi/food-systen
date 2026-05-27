import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
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

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

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

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AdminLayout>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Produtos</h1>
            <p className="text-slate-500 font-medium">Cadastre, edite e organize o cardápio da sua loja.</p>
          </div>
          <button 
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="h-14 px-8 bg-primary text-white rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
          >
             <Plus size={20} /> NOVO PRODUTO
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome ou categoria..."
              className="w-full h-14 pl-12 pr-4 bg-slate-50 border-transparent rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-700"
            />
          </div>
          <button className="h-14 px-6 rounded-2xl border-2 border-slate-50 text-slate-500 font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Filter size={18} /> Categorias
          </button>
        </div>

        {/* Grid de Produtos Moderno */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-4">
               <Loader2 className="animate-spin text-primary" size={40} />
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando estoque...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  key={product.id}
                  className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package size={64} />
                      </div>
                    )}
                    
                    <div className="absolute top-4 left-4">
                        <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 border border-white/50 shadow-sm flex items-center gap-1.5">
                          <Tag size={12} className="text-primary" /> {product.category?.name || "Sem Categ."}
                        </span>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-6">
                          <div className="flex gap-2">
                               <button 
                                  onClick={() => {
                                      setSelectedProduct(product);
                                      setIsModalOpen(true);
                                  }}
                                  className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 hover:bg-primary hover:text-white transition-all shadow-lg active:scale-90"
                               >
                                  <Edit2 size={20} />
                               </button>
                               <button 
                                  onClick={() => handleDelete(product.id)}
                                  className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-90"
                               >
                                  <Trash2 size={20} />
                               </button>
                          </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-black text-lg text-slate-900 leading-tight uppercase tracking-tighter truncate flex-1 pr-2">
                        {product.name}
                      </h3>
                      {product.status === 'active' ? (
                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={20} className="text-rose-500 shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preço de Venda</p>
                          <p className="text-2xl font-black text-primary tracking-tighter">
                            {formatCurrency(product.price)}
                          </p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                          <div className={cn(
                              "w-8 h-4 rounded-full mt-1 ml-auto transition-colors",
                              product.status === 'active' ? "bg-emerald-100" : "bg-slate-100"
                          )}>
                              <div className={cn(
                                  "w-4 h-4 rounded-full shadow-sm transition-all",
                                  product.status === 'active' ? "bg-emerald-500 translate-x-4" : "bg-slate-400"
                              )} />
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
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
      </AdminLayout>
    </>
  );
}
