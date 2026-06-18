"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useProducts } from "../hooks/useProducts";
import { Header } from "../components/layout/Header";
import { NavSidebar } from "../components/layout/NavSidebar";
import { Footer } from "../components/layout/Footer";
import { ProductCard } from "../components/product/ProductCard";
import { Button } from "../../../shared/components/ui/button";
import { useSettings } from "../../../core/hooks/useSettings";
import { AnimatePresence, motion } from "framer-motion";
import { Utensils, ArrowRight, Flame } from "lucide-react";
import { cn } from "../../../shared/utils";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const { products, categories, isLoading: productsLoading } = useProducts() as any;
  const { settings, isLoading: settingsLoading } = useSettings();
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [splashReady, setSplashReady] = useState(false);
  const [forceShowContent, setForceShowContent] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const splashStartRef = useRef<number>(Date.now());

  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (productsLoading || !rootRef.current) return;
    if (isMobile) return;

    // Aguarda um pequeno delay para garantir que o layout final do Next.js terminou de assentar
    const timer = setTimeout(() => {
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
            invalidateOnRefresh: true,
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
            invalidateOnRefresh: true,
          },
          y: 14,
          opacity: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: "power3.out",
        });

      }, rootRef);
    }, 100);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [productsLoading, isMobile]);

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

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setSplashReady(false);
    splashStartRef.current = Date.now();
  }, [heroImage]);

  useEffect(() => {
    const maxWaitTimer = window.setTimeout(() => {
      setForceShowContent(true);
    }, 3500);

    return () => window.clearTimeout(maxWaitTimer);
  }, []);

  useEffect(() => {
    if (settingsLoading || productsLoading) return;

    const minSplashMs = 700;
    const elapsed = Date.now() - splashStartRef.current;
    const remaining = Math.max(minSplashMs - elapsed, 0);

    const timer = window.setTimeout(() => setSplashReady(true), remaining);
    return () => window.clearTimeout(timer);
  }, [settingsLoading, productsLoading]);

  const showSplash = !forceShowContent && !(splashReady && !settingsLoading && !productsLoading);

  const splashScreen = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-200 bg-slate-950 flex items-center justify-center px-6"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.985),rgba(2,6,23,0.99))]" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.05 }}
        className="relative z-10 flex flex-col items-center text-center max-w-lg"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.12 }}
          className="w-24 h-24 md:w-28 md:h-28 rounded-4xl bg-white/10 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl shadow-black/30 mb-7"
        >
          <Utensils size={42} className="text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="mt-3 text-5xl md:text-7xl font-display font-black text-white tracking-[0.02em] leading-[0.9] drop-shadow-2xl"
        >
          FoodSystem
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28 }}
          className="mt-4 text-[11px] md:text-sm font-medium uppercase tracking-[0.26em] text-slate-300 max-w-sm"
        >
          A maneira inteligente de pedir comida.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.4 }}
          className="mt-10 flex items-center justify-center w-full max-w-xs"
        >
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10 border border-white/10">
            <motion.div
              initial={{ x: "-60%" }}
              animate={{ x: "120%" }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-linear-to-r from-transparent via-primary to-transparent opacity-90"
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );

  return (
    <div ref={rootRef} className="min-h-screen bg-slate-50 flex flex-col selection:bg-primary selection:text-white">
      <AnimatePresence>{showSplash && splashScreen}</AnimatePresence>

      {!showSplash && (
        <div className="opacity-100 transition-opacity duration-500 overflow-x-hidden">
          <div className="home-header">
            <Header settings={settings} onOpenMenu={() => setIsNavOpen(true)} />
          </div>

          <NavSidebar
            isOpen={isNavOpen}
            onClose={() => setIsNavOpen(false)}
            categories={categories}
            activeCategory={activeCategory}
            onCategorySelect={setActiveCategory}
          />

          <main className="flex-1 container mx-auto px-4 md:px-6 pt-0 pb-6 md:pb-12 space-y-8 md:space-y-24">
            {/* Hero Section Premium com GSAP */}
            <section className="relative mt-0">
              <div className="relative left-1/2 w-dvw max-w-none -translate-x-1/2">
                <div
                  ref={heroRef}
                  className="home-hero-art relative overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.24)] aspect-[4/5] sm:aspect-[16/10] md:aspect-[21/9] min-h-[540px] sm:min-h-80 md:min-h-[600px] flex items-end"
                  style={{ backgroundColor: "#0f172a" }}
                >
                  {/* Background Art (full-bleed) */}
                  <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.45),rgba(15,23,42,0.18)_35%,rgba(2,6,23,0.65))]" />
                    <div
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${heroImage})` }}
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/10 to-black/55 md:bg-none md:[background:linear-gradient(to_right,rgba(15,23,42,0.6),rgba(15,23,42,0.3),transparent)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.12),rgba(2,6,23,0.55))]" />
                  </div>

                  <div className="relative z-10 w-full p-5 pt-16 pb-8 sm:pt-20 sm:pb-10 md:pt-12 md:p-12 max-w-2xl space-y-2 md:space-y-5">
                    <div>
                      <div className="home-hero-badge inline-flex items-center mb-3 md:mb-6 ml-0.5 md:ml-1">
                        <div className="bg-primary/25 backdrop-blur-xl border border-primary/35 px-3 md:px-4 py-1 md:py-1.5 rounded-full inline-flex items-center gap-2 md:gap-2.5 shadow-lg shadow-primary/15">
                          <Flame size={11} className="md:size-4.5 text-primary fill-primary animate-pulse" />
                          <span className="text-primary text-[8px] md:text-[9px] font-bold uppercase tracking-[0.18em]">{heroBadge}</span>
                        </div>
                      </div>

                      <h1
                        style={{ fontWeight: 900 }}
                        className="home-hero-title text-3xl sm:text-[40px] md:text-[52px] lg:text-[60px] font-display text-white leading-[0.92] md:leading-[0.88] tracking-tight uppercase mb-2 md:mb-4 drop-shadow-2xl max-w-xl"
                      >
                        {heroTitleLine1} <br />
                        <span className="text-primary text-outline-white">{heroTitleLine2}</span>
                      </h1>

                      <p className="home-hero-copy text-sm md:text-[15px] text-slate-200 font-medium max-w-lg leading-relaxed">
                        {heroDescription}
                      </p>
                    </div>

                    <div className="home-hero-actions flex flex-col sm:flex-row items-center gap-2 md:gap-6 pt-2 md:pt-4">
                      <Button
                        size="lg"
                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-xl md:rounded-2xl px-4 md:px-10 h-12 md:h-16 text-[10px] md:text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 group"
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
              </div>
            </section>

            <div className="h-px w-full bg-slate-200/60 my-6 md:my-10" />

            {/* Categories Navigation */}
            <section id="menu-section" className="mt-4 md:mt-8">
              <div className="space-y-6 md:space-y-8">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 md:gap-6">
                  <div className="home-section-heading space-y-1 md:space-y-2 shrink-0">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-[0.24em] text-primary font-black">Vitrine da casa</p>
                    <h2 className="text-2xl md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Nosso Cardápio</h2>
                    <div className="h-1 md:h-1.5 w-24 bg-primary rounded-full" />
                  </div>

                  <div className="flex items-center gap-3 md:gap-8 overflow-x-auto pb-1 xl:pb-0 no-scrollbar xl:justify-end -mx-2 px-2 md:mx-0 md:px-0 scroll-smooth w-auto max-w-full">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={cn(
                        "home-category-chip shrink-0",
                        "h-auto py-2 pb-3 px-2 md:px-0.5 rounded-none text-[10px] md:text-sm font-black uppercase tracking-[0.06em] md:tracking-tight transition-all whitespace-nowrap border-b-2",
                        activeCategory === 'all'
                          ? "border-primary text-slate-950"
                          : "border-transparent text-slate-600 hover:text-slate-800"
                      )}
                    >
                      Todos
                    </button>
                    {categories?.map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                          "home-category-chip shrink-0",
                          "h-auto py-2 pb-3 px-2 md:px-0.5 rounded-none text-[10px] md:text-sm font-black uppercase tracking-[0.06em] md:tracking-tight transition-all whitespace-nowrap border-b-2",
                          activeCategory === cat.id
                            ? "border-primary text-slate-950"
                            : "border-transparent text-slate-600 hover:text-slate-800"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Grid */}
                <div className="home-products-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-8">
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
                  <div className="py-18 md:py-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 border border-slate-200">
                      <Utensils size={40} />
                    </div>
                    <p className="text-slate-500 font-medium text-sm md:text-lg uppercase tracking-[0.14em]">Nenhum item encontrado nesta categoria.</p>
                  </div>
                )}
              </div>
            </section>
          </main>

          <Footer />
        </div>
      )}
    </div>
  );
}
