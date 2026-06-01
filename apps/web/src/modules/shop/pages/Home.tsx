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
  const { products, categories, isLoading } = useProducts();
  const { settings } = useSettings();
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            
            <div className="relative h-full flex flex-col justify-center p-8 md:p-14 max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 mb-4"
              >
                <span className="bg-primary/20 backdrop-blur-md text-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-primary/20">
                  Novidade
                </span>
                <span className="flex items-center gap-1 text-white/60 text-xs font-bold uppercase tracking-widest">
                  <Star size={12} className="fill-yellow-500 text-yellow-500" /> Melhores da Cidade
                </span>
              </motion.div>

              <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
                {settings?.storeName || 'FoodSystem'}<br/>
                <span className="text-primary italic">Inesquecível.</span>
              </h2>
              
              <div className="flex flex-wrap gap-4 mt-4">
                <Button size="lg" className="rounded-2xl h-14 px-8 font-black text-lg gap-3">
                  <Zap size={20} /> Pedir Agora
                </Button>
                {!settings?.isOpen && (
                  <div className="bg-red-500/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-red-500/30 text-red-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Fechado no momento
                  </div>
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
               <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Info size={24} />
               </div>
               <div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tighter text-sm mb-1">Sobre nós</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">
                    {settings?.bio || "Carregando informações da loja..."}
                  </p>
               </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4 relative overflow-hidden group">
               <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin size={24} />
               </div>
               <div className="flex-1">
                  <h4 className="font-black text-slate-800 uppercase tracking-tighter text-sm mb-1">Localização</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-3">
                    {settings?.address || "Carregando endereço..."}
                  </p>
                  
                  {settings?.address && (
                    <div className="space-y-3">
                         <a 
                            href={settings.latitude && settings.longitude 
                                ? `https://www.google.com/maps/search/?api=1&query=${settings.latitude},${settings.longitude}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`
                            }
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
                                src={`https://maps.google.com/maps?q=${settings.latitude && settings.longitude ? `${settings.latitude},${settings.longitude}` : encodeURIComponent(settings.address)}&z=17&output=embed`}
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
        <section className="mb-10 sticky top-20 z-40 py-4 bg-[#F8FAFC]/80 backdrop-blur-md -mx-4 px-4">
            <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
                <CategoryTab 
                  active={activeCategory === 'all'} 
                  onClick={() => setActiveCategory('all')}
                  label="Todos"
                  icon={Sparkles}
                />
                {!isLoading && categories?.map((cat) => (
                    <CategoryTab 
                      key={cat.id}
                      active={activeCategory === cat.id}
                      onClick={() => setActiveCategory(cat.id as number)}
                      label={cat.name}
                      icon={Utensils}
                    />
                ))}
                {isLoading && Array(5).fill(0).map((_, i) => (
                   <Skeleton key={i} className="h-12 w-32 rounded-2xl shrink-0" />
                ))}
            </div>
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

function CategoryTab({ active, onClick, label, icon: Icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 h-12 rounded-2xl font-bold transition-all shrink-0 border-2 uppercase",
        active 
          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" 
          : "bg-white border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
      )}
    >
      <Icon size={18} className={active ? "text-white" : "text-primary"} />
      {label}
    </button>
  );
}
