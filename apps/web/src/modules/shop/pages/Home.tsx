import { useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { Header } from "../components/layout/Header";
import { NavSidebar } from "../components/layout/NavSidebar";
import { Footer } from "../components/layout/Footer";
import { ProductCard } from "../components/product/ProductCard";
import { Button } from "../../../shared/components/ui/button";
import { useSettings } from "../../../core/hooks/useSettings";
import { Skeleton } from "../../../shared/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Utensils, Zap, Star, Info, MapPin } from "lucide-react";
import { cn } from "../../../shared/utils";

export default function Home() {
  const { products, categories, isLoading: productsLoading } = useProducts();
  const { settings, isLoading: settingsLoading, error: settingsError } = useSettings();
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isLoading = productsLoading || settingsLoading;

  if (settingsError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 bg-rose-100 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
          <Utensils size={48} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Loja não encontrada</h1>
        <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
          Não conseguimos encontrar os detalhes desta loja. Verifique o link e tente novamente.
        </p>
        <Button 
          onClick={() => window.location.href = '/'}
          className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black"
        >
          VOLTAR PARA O INÍCIO
        </Button>
      </div>
    );
  }

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.categoryId === activeCategory);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header onOpenMenu={() => setIsMenuOpen(true)} />

      <NavSidebar 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        activeCategory={activeCategory}
        onCategorySelect={setActiveCategory}
      />
      
      <main className="container px-4 py-8 mx-auto max-w-7xl flex-1">
        {/* Hero Section Modernizada */}
        <section className="mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden bg-slate-900 h-75 md:h-87.5 shadow-2xl"
          >
            {/* Background com Overlay */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200')] bg-cover bg-center opacity-40 mix-blend-overlay" />
            <div className="absolute inset-0 bg-linear-to-r from-slate-900 via-slate-900/60 to-transparent" />
            
            <div className="relative h-full flex flex-col justify-center p-8 md:p-20 max-w-4xl">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 mb-6"
              >
                <div className="bg-primary/20 backdrop-blur-md px-3 py-1 rounded-lg border border-primary/20">
                  <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                    Novidade
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-white/60 text-[10px] font-black uppercase tracking-widest">
                  <Star size={12} className="fill-yellow-500 text-yellow-500" /> Melhores da Cidade
                </span>
              </motion.div>

              <h2 className="text-6xl md:text-9xl font-black text-white mb-2 tracking-tighter leading-none uppercase drop-shadow-2xl">
                {settings?.storeName || 'FoodSystem'}
              </h2>
              <p className="text-primary italic text-4xl md:text-7xl font-serif ml-4 md:ml-8 drop-shadow-xl animate-in fade-in slide-in-from-left-4 duration-1000">
                Inesquecível.
              </p>
              
              <div className="flex flex-wrap gap-4 mt-12">
                {!settings?.isOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/20 backdrop-blur-md px-8 py-4 rounded-2xl border border-red-500/30 text-red-100 font-black uppercase tracking-widest text-xs flex items-center gap-3"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    Fechado no momento
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Info Card - Bio e Endereço */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"
          >
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4">
               <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Info size={24} />
               </div>
               <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-[0.2em] text-[10px] mb-2">Sobre nós</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-sm">
                    {settings?.bio || "Carregando informações da loja..."}
                  </p>
               </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4 relative overflow-hidden group">
               <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin size={24} />
               </div>
               <div className="flex-1">
                  <h4 className="font-black text-slate-900 uppercase tracking-[0.2em] text-[10px] mb-2">Localização</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4 uppercase">
                    {isLoading ? "Carregando endereço..." : (settings?.address || "Endereço não cadastrado")}
                  </p>
                  
                  {settings?.address && (
                    <div className="space-y-3">
                         <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:gap-3 transition-all"
                        >
                            Abrir no GPS <Zap size={12} className="fill-primary" />
                        </a>

                        {/* Mapa Miniatura */}
                        <div className="w-full h-32 rounded-2xl overflow-hidden border border-slate-100 shadow-inner group-hover:h-48 transition-all duration-500">
                             <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0, filter: 'grayscale(0.2) contrast(1.1)' }}
                                loading="lazy"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&z=17&output=embed`}
                            ></iframe>
                        </div>
                    </div>
                  )}
               </div>


               
               {/* Decoração sutil */}
               <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                  <MapPin size={100} />
               </div>
            </div>
          </motion.div>
        </section>

        {/* Categorias - Estilo Tabs Modernas */}
        <section className="mb-12 sticky top-20 z-40 py-6 bg-[#F8FAFC]/80 backdrop-blur-xl -mx-6 px-6">
            <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2">
                <CategoryTab 
                  active={activeCategory === 'all'} 
                  onClick={() => setActiveCategory('all')}
                  label="Todos"
                />
                {!isLoading && categories?.map((cat) => (
                    <CategoryTab 
                      key={cat.id}
                      active={activeCategory === cat.id}
                      onClick={() => setActiveCategory(cat.id as number)}
                      label={cat.name}
                    />
                ))}
                {isLoading && Array(5).fill(0).map((_, i) => (
                   <Skeleton key={i} className="h-10 w-32 rounded-full shrink-0" />
                ))}
            </div>
            <div className="h-px bg-slate-200/50 w-full mt-2" />
        </section>

        {/* Grid de Produtos com Animação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                    <Skeleton className="aspect-square w-full rounded-3xl" />
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex justify-between items-center pt-2">
                         <Skeleton className="h-8 w-24" />
                         <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                </div>
              ))
            ) : filteredProducts.map((product) => (
              <motion.div
                layout
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard product={product as any} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && !isLoading && (
            <div className="py-20 text-center">
                <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Utensils className="text-slate-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Nenhum produto nesta categoria</h3>
                <p className="text-slate-500">Tente selecionar outra categoria do cardápio.</p>
            </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function CategoryTab({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-center px-8 h-10 rounded-full font-black transition-all shrink-0 uppercase tracking-[0.2em] text-[10px]",
        active 
          ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-105" 
          : "bg-white text-slate-400 hover:text-slate-600 border border-slate-100"
      )}
    >
      {label}
    </button>
  );
}
