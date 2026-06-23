"use client";

import { useState, useMemo } from "react";
import { useProducts } from "../hooks/useProducts";
import { Header } from "../components/layout/Header";
import { NavSidebar } from "../components/layout/NavSidebar";
import { Footer } from "../components/layout/Footer";
import { ProductCard } from "../components/product/ProductCard";
import { Button } from "../../../shared/components/ui/button";
import { useSettings } from "../../../core/hooks/useSettings";
import { Utensils, ArrowRight, Flame } from "lucide-react";
import { cn } from "../../../shared/utils";

export default function Home() {
  const { products, categories, isLoading: productsLoading } = useProducts() as any;
  const { settings, isLoading: settingsLoading } = useSettings();
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [isNavOpen, setIsNavOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === "all") return products;
    return products.filter((p: any) => p.categoryId === activeCategory);
  }, [products, activeCategory]);

  const heroBadge = settings?.bannerBadge || "Destaque da semana";
  const heroTitleLine1 = settings?.bannerTitleLine1 || "Sabor que";
  const heroTitleLine2 = settings?.bannerTitleLine2 || "Transforma";
  const heroDescription = settings?.bannerDescription || settings?.bio || "Experiência gastronômica executiva com ingredientes selecionados e preparo artesanal.";
  const heroCtaLabel = settings?.bannerCtaLabel || "Explorar Menu";
  const heroImage = settings?.bannerImage || "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2000";

  const isLoading = settingsLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin border-opacity-30 border-t-opacity-100" />
          <p className="mt-4 text-slate-400 font-medium uppercase tracking-widest text-xs animate-pulse">
            Carregando Cardápio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-primary selection:text-white">
      <div className="opacity-100">
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
          <section className="relative mt-0">
            <div className="relative left-1/2 w-dvw max-w-none -translate-x-1/2">
              <div className="home-hero-art relative overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.24)] min-h-[72vw] sm:min-h-80 md:min-h-150 flex items-center">
                <div className="absolute inset-0 z-0">
                  <img
                    src={heroImage}
                    className="w-full h-full object-cover object-center"
                    alt={settings?.storeName || "Fundo Gourmet"}
                  />
                  <div className="absolute inset-0 bg-linear-to-b from-black/50 via-black/30 to-black/60 md:bg-none md:[background:linear-gradient(to_right,rgba(15,23,42,0.6),rgba(15,23,42,0.3),transparent)]" />
                </div>

                <div className="relative z-10 p-5 pt-16 sm:pt-20 md:pt-12 md:p-12 max-w-2xl space-y-2 md:space-y-5">
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
                        const el = document.getElementById("menu-section");
                        el?.scrollIntoView({ behavior: "smooth" });
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
                    onClick={() => setActiveCategory("all")}
                    className={cn(
                      "home-category-chip shrink-0",
                      "h-auto py-2 pb-3 px-2 md:px-0.5 rounded-none text-[10px] md:text-sm font-black uppercase tracking-[0.06em] md:tracking-tight transition-all whitespace-nowrap border-b-2",
                      activeCategory === "all"
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

              <div className="home-products-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-8">
                {filteredProducts.map((product: any) => (
                  <div key={product.id} className="home-product-item">
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
    </div>
  );
}
