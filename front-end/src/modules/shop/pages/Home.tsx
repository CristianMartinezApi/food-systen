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
import { motion } from "framer-motion";
import { Utensils, ArrowRight, Flame } from "lucide-react";
import { cn, formatCurrency } from "../../../shared/utils";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const { products, categories, isLoading: productsLoading } = useProducts() as any;
  const { settings, isLoading: settingsLoading } = useSettings();
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [isNavOpen, setIsNavOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (productsLoading || !rootRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".home-header", {
        y: -18,
        opacity: 0,
        duration: 0.7,
        stagger: 0.06,
      })
        .from(".home-hero-badge", {
          y: 18,
          opacity: 0,
          duration: 0.55,
        }, "-=0.2")
        .from(".home-hero-title", {
          y: 34,
          opacity: 0,
          duration: 0.85,
        }, "-=0.16")
        .from(".home-hero-copy", {
          y: 22,
          opacity: 0,
          duration: 0.7,
        }, "-=0.45")
        .from(".home-hero-actions", {
          y: 18,
          opacity: 0,
          duration: 0.6,
        }, "-=0.4")
        .from(".home-hero-art", {
          scale: 0.96,
          opacity: 0,
          duration: 0.9,
        }, "-=0.65");

      gsap.from(".home-section-heading", {
        scrollTrigger: {
          trigger: "#menu-section",
          start: "top 80%",
        },
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".home-category-chip", {
        scrollTrigger: {
          trigger: "#menu-section",
          start: "top 75%",
        },
        y: 14,
        opacity: 0,
        duration: 0.45,
        stagger: 0.06,
        ease: "power3.out",
      });

    }, rootRef);

    return () => ctx.revert();
  }, [productsLoading]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === 'all') return products;
    return products.filter((p: any) => p.categoryId === activeCategory);
  }, [products, activeCategory]);

  const heroBadge = settings?.bannerBadge || "O mais desejado de 2024";
  const heroTitleLine1 = settings?.bannerTitleLine1 || "Sabor que";
  const heroTitleLine2 = settings?.bannerTitleLine2 || "Transforma";
  const heroDescription = settings?.bannerDescription || settings?.bio || "Experiência gastronômica executiva com ingredientes selecionados e preparo artesanal.";
  const heroCtaLabel = settings?.bannerCtaLabel || "Explorar Menu";
  const heroImage = settings?.bannerImage || "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2000";

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header onOpenMenu={() => setIsNavOpen(true)} />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12">
          <Skeleton className="h-75 md:h-125 w-full rounded-[2.5rem] md:rounded-[3.5rem] mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 md:h-96 w-full rounded-4xl md:rounded-[2.5rem]" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="min-h-screen bg-slate-50 flex flex-col selection:bg-primary selection:text-white">
      <div className="home-header">
        <Header onOpenMenu={() => setIsNavOpen(true)} />
      </div>
      
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
          <div ref={heroRef} className="home-hero-art relative rounded-[2.5rem] md:rounded-[3.5rem] bg-slate-950 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)] min-h-112.5 md:min-h-150 flex items-center">
            {/* Background Art */}
            <div className="absolute inset-0 z-0">
              <img 
                src={heroImage}
                className="w-full h-full object-cover opacity-60 scale-105"
                alt={settings?.storeName || "Fundo Gourmet"}
              />
              <div className="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-slate-950 to-transparent" />
            </div>

            <div className="relative z-10 p-8 md:p-20 max-w-4xl space-y-6 md:space-y-8">
              <div>
                <div className="home-hero-badge flex items-center gap-4 mb-6 md:mb-8">
                  <div className="bg-primary/20 backdrop-blur-xl border border-primary/30 px-4 py-1.5 rounded-full flex items-center gap-2">
                    <Flame size={14} className="text-primary fill-primary animate-pulse" />
                    <span className="text-primary text-[10px] font-bold uppercase tracking-[0.3em]">{heroBadge}</span>
                  </div>
                </div>

                <h1 className="home-hero-title text-5xl md:text-display font-display text-white leading-[0.9] md:leading-[0.85] tracking-tighter uppercase mb-6 drop-shadow-2xl">
                  {heroTitleLine1} <br/>
                  <span className="text-primary text-outline-white">{heroTitleLine2}</span>
                </h1>
                
                <p className="home-hero-copy text-lg md:text-xl text-slate-300 font-medium max-w-xl leading-relaxed">
                  {heroDescription}
                </p>
              </div>

              <div className="home-hero-actions flex flex-col sm:flex-row items-center gap-4 md:gap-6 pt-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-2xl px-8 md:px-10 h-14 md:h-16 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 group"
                  onClick={() => {
                    const el = document.getElementById('menu-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {heroCtaLabel}
                  <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                
              </div>
            </div>
          </div>
        </section>

        {/* Categories Navigation */}
        <section id="menu-section" className="space-y-8 md:space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="home-section-heading space-y-2">
              <h2 className="text-3xl md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Nosso Cardápio</h2>
              <div className="h-1.5 w-24 bg-primary rounded-full" />
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-4 md:pb-0 no-scrollbar">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "home-category-chip",
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
                    "home-category-chip",
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
          <div className="home-products-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 md:gap-10">
            {filteredProducts.map((product: any) => (
              <div
                key={product.id}
                className="home-product-item"
                style={{ opacity: 1, transform: "none" }}
              >
                <ProductCard product={product} />
              </div>
            ))}
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
