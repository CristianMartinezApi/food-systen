"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useProducts } from "../hooks/useProducts";
import { Header } from "../components/layout/Header";
import { NavSidebar } from "../components/layout/NavSidebar";
import { Footer } from "../components/layout/Footer";
import { ProductCard } from "../components/product/ProductCard";
import { Button } from "../../../shared/components/ui/button";
import { useSettings } from "../../../core/hooks/useSettings";
import { Skeleton } from "../../../shared/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Utensils, ArrowRight, Zap, Flame, ShoppingBag } from "lucide-react";
import { cn, formatCurrency } from "../../../shared/utils";
import { gsap } from "gsap";

export default function Home() {
  const { products, categories, isLoading: productsLoading } = useProducts() as any;
  const { settings, isLoading: settingsLoading } = useSettings();
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [isNavOpen, setIsNavOpen] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!productsLoading && !settingsLoading) {
      const ctx = gsap.context(() => {
        // Animação de entrada do Hero com Stagger
        gsap.from(".hero-content > *", {
          y: 60,
          opacity: 0,
          duration: 1.2,
          stagger: 0.2,
          ease: "expo.out",
          delay: 0.5
        });

        // Efeito de brilho flutuante no título
        gsap.to(".hero-title", {
          textShadow: "0 0 30px rgba(246, 111, 25, 0.4)",
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }, heroRef);

      return () => ctx.revert();
    }
  }, [productsLoading, settingsLoading]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === 'all') return products;
    return products.filter((p: any) => p.categoryId === activeCategory);
  }, [products, activeCategory]);

  if (productsLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header onOpenMenu={() => setIsNavOpen(true)} />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12">
          <Skeleton className="h-[300px] md:h-[500px] w-full rounded-[2.5rem] md:rounded-[3.5rem] mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 md:h-96 w-full rounded-[2rem] md:rounded-[2.5rem]" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-primary selection:text-white">
      <Header onOpenMenu={() => setIsNavOpen(true)} />
      
      <NavSidebar 
        isOpen={isNavOpen} 
        onClose={() => setIsNavOpen(false)} 
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12 space-y-16 md:space-y-24">
        {/* Hero Section Premium com GSAP */}
        <section className="relative">
          <div ref={heroRef} className="relative rounded-[2.5rem] md:rounded-[3.5rem] bg-slate-950 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)] min-h-[450px] md:min-h-[600px] flex items-center">
            {/* Background Art */}
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2000" 
                className="w-full h-full object-cover opacity-60 scale-105"
                alt="Fundo Gourmet"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 to-transparent" />
            </div>

            <div className="relative z-10 p-8 md:p-20 max-w-4xl space-y-6 md:space-y-8 hero-content">
              <div>
                <div className="flex items-center gap-4 mb-6 md:mb-8">
                  <div className="bg-primary/20 backdrop-blur-xl border border-primary/30 px-4 py-1.5 rounded-full flex items-center gap-2">
                    <Flame size={14} className="text-primary fill-primary animate-pulse" />
                    <span className="text-primary text-[10px] font-bold uppercase tracking-[0.3em]">O mais desejado de 2024</span>
                  </div>
                </div>

                <h1 ref={titleRef} className="hero-title text-5xl md:text-display font-display text-white leading-[0.9] md:leading-[0.85] tracking-tighter uppercase mb-6 drop-shadow-2xl">
                  Sabor que <br/>
                  <span className="text-primary text-outline-white">Transforma</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-300 font-medium max-w-xl leading-relaxed">
                  Experiência gastronômica executiva com ingredientes selecionados e preparo artesanal.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 pt-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-2xl px-8 md:px-10 h-14 md:h-16 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 group"
                  onClick={() => {
                    const el = document.getElementById('menu-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Explorar Menu
                  <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <div className="flex items-center gap-4 px-6 py-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                  <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="avatar" />
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] md:text-xs">
                    <p className="text-white font-bold">+500 Clientes VIP</p>
                    <div className="flex gap-0.5 text-yellow-500">
                      {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Navigation */}
        <section id="menu-section" className="space-y-8 md:space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Nosso Cardápio</h2>
              <div className="h-1.5 w-24 bg-primary rounded-full" />
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-4 md:pb-0 no-scrollbar">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2",
                  activeCategory === 'all' 
                    ? "bg-slate-950 text-white border-slate-950 shadow-lg" 
                    : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                )}
              >
                Todos
              </button>
              {categories?.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2",
                    activeCategory === cat.id 
                      ? "bg-slate-950 text-white border-slate-950 shadow-lg" 
                      : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 md:gap-10">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product: any) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-24 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Utensils size={40} />
              </div>
              <p className="text-slate-400 font-medium text-lg uppercase tracking-widest">Nenhum item encontrado nesta categoria.</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
