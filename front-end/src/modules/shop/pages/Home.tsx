"use client";

import { useState, useMemo, useEffect } from "react";
import { useProducts } from "../hooks/useProducts";
import { useHighlights } from "../hooks/useHighlights";
import { Header } from "../components/layout/Header";
import { NavSidebar } from "../components/layout/NavSidebar";
import { Footer } from "../components/layout/Footer";
import { ProductCard } from "../components/product/ProductCard";
import { HighlightProductCard } from "../components/product/HighlightProductCard";
import { Button } from "../../../shared/components/ui/button";
import { useSettings } from "../../../core/hooks/useSettings";
import { Utensils, ArrowRight, Flame, RefreshCw, MessageCircle, Phone, AlertTriangle, WifiOff } from "lucide-react";
import { cn } from "../../../shared/utils";
import { sendToWhatsApp } from "../../../shared/utils/whatsapp";

export default function Home() {
  const { products, categories, isLoading: productsLoading, error: productsError, isStale: productsStale } = useProducts() as any;
  const { productIds: highlightProductIds } = useHighlights();
  const { settings, isLoading: settingsLoading, error: settingsError, isStale: settingsStale } = useSettings();
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const hasStoreLoadError = (Boolean(settingsError) && !settings) || (Boolean(productsError) && products.length === 0);
  const isUsingSavedData = !isOnline || Boolean(productsStale) || Boolean(settingsStale);
  const isInitialStoreLoading =
    (settingsLoading && !settings) ||
    (productsLoading && products.length === 0);
  const supportPhone = settings?.phone || "";

  const handleContactStore = () => {
    if (!supportPhone) return;

    const digits = supportPhone.replace(/\D/g, "");
    if (!digits) return;

    const message = encodeURIComponent("Olá! Não consegui carregar a loja no app e preciso de ajuda para finalizar meu pedido.");
    sendToWhatsApp(supportPhone, message);
  };

  const handleCallStore = () => {
    if (!supportPhone) return;

    const digits = supportPhone.replace(/\D/g, "");
    if (!digits) return;

    window.location.href = `tel:${digits}`;
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;

    if (activeCategory !== "all") {
      filtered = filtered.filter((p: any) => p.categoryId === activeCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((p: any) =>
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [products, activeCategory, searchTerm]);

  const highlightedProducts = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [];

    const byId = new Map(products.map((product: any) => [Number(product.id), product]));
    const topSelling = Array.isArray(highlightProductIds)
      ? highlightProductIds
          .map((productId) => byId.get(Number(productId)))
          .filter((product: any) => Boolean(product && product.isActive))
      : [];

    if (topSelling.length > 0) {
      return topSelling;
    }

    return products
      .filter((product: any) => product.isActive && product.isFeatured)
      .slice(0, 6);
  }, [highlightProductIds, products]);

  const heroBadge = settings?.bannerBadge || "Destaque da semana";
  const heroTitleLine1 = settings?.bannerTitleLine1 || "Sabor que";
  const heroTitleLine2 = settings?.bannerTitleLine2 || "Transforma";
  const heroDescription = settings?.bannerDescription || settings?.bio || "Experiência gastronômica executiva com ingredientes selecionados e preparo artesanal.";
  const heroCtaLabel = settings?.bannerCtaLabel || "Explorar Menu";
  const heroImage = settings?.bannerImage || "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=70";

  if (hasStoreLoadError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl rounded-4xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 md:p-10 text-center shadow-2xl shadow-black/30 space-y-6">
          <div className="mx-auto w-18 h-18 rounded-3xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center text-amber-300">
            <AlertTriangle size={34} />
          </div>

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.24em] font-black text-amber-300">Loja indisponível no momento</p>
            <h1 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight leading-tight">
              Não foi possível carregar esta loja agora
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-lg mx-auto">
              Estamos com instabilidade temporária para carregar o cardápio e as informações da loja.
              Você pode tentar novamente agora ou entrar em contato direto com o estabelecimento.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-6 h-13 font-black uppercase tracking-widest"
            >
              <RefreshCw size={16} className="mr-2" />
              Tentar novamente
            </Button>

            {supportPhone ? (
              <Button
                onClick={handleContactStore}
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-2xl px-6 h-13 font-black uppercase tracking-widest"
              >
                <MessageCircle size={16} className="mr-2" />
                Falar com a loja
              </Button>
            ) : null}
          </div>

          {supportPhone ? (
            <button
              onClick={handleCallStore}
              className="mx-auto flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <Phone size={15} />
              {supportPhone}
            </button>
          ) : (
            <p className="text-xs text-slate-400 uppercase tracking-[0.16em]">
              O contato da loja não está disponível no momento.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-primary selection:text-white overflow-x-hidden pb-20 md:pb-0">
      {isInitialStoreLoading ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950 px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_34%),radial-gradient(circle_at_20%_90%,rgba(56,189,248,0.12),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.985),rgba(2,6,23,0.99))]" />
          <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
            <div className="mb-7 h-24 w-24 animate-pulse rounded-3xl border border-white/10 bg-white/6 p-1 shadow-xl shadow-black/25 md:h-28 md:w-28">
              <img
                src="/foodsystem-icon-512.png"
                alt="Logo FoodSystem"
                className="h-full w-full rounded-[1.1rem] object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
            <h1 className="text-5xl font-display font-black leading-[0.9] tracking-[0.02em] text-white drop-shadow-2xl md:text-7xl">
              FoodSystem
            </h1>
            <p className="mt-4 max-w-sm text-[11px] font-medium uppercase tracking-[0.26em] text-slate-300 md:text-sm">
              Preparando o cardápio da loja
            </p>
            <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col flex-1">
        <div className="home-header">
          <Header
            settings={settings}
            onOpenMenu={() => setIsNavOpen(true)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>

        {isUsingSavedData && (settings || products.length > 0) ? (
          <div className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-900">
            <WifiOff size={14} />
            Conexão instável. Exibindo os últimos dados salvos.
          </div>
        ) : null}

        <NavSidebar
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          categories={categories}
          settings={settings}
          activeCategory={activeCategory}
          onCategorySelect={setActiveCategory}
        />

        <main className="flex-1 container mx-auto px-4 md:px-6 pt-0 pb-6 md:pb-12 space-y-8 md:space-y-24">
          <section className="relative mt-0">
            <div className="relative left-1/2 w-dvw max-w-none -translate-x-1/2">
              <div className="home-hero-art relative overflow-hidden shadow-[0_18px_42px_rgba(0,0,0,0.2)] md:shadow-[0_30px_80px_rgba(0,0,0,0.24)] min-h-[240px] sm:min-h-[280px] md:min-h-150 flex items-center">
                <div className="absolute inset-0 z-0">
                  <img
                    src={heroImage}
                    className="w-full h-full object-cover object-center"
                    alt={settings?.storeName || "Fundo Gourmet"}
                    loading="eager"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-linear-to-b from-black/50 via-black/30 to-black/60 md:bg-none md:[background:linear-gradient(to_right,rgba(15,23,42,0.6),rgba(15,23,42,0.3),transparent)]" />
                </div>

                <div className="relative z-10 p-5 pt-16 md:pt-12 md:p-12 max-w-2xl space-y-2 md:space-y-5">
                  <div>
                    <div className="home-hero-badge inline-flex items-center mb-3 md:mb-6 ml-0.5 md:ml-1">
                      <div className="bg-primary/25 backdrop-blur-xl border border-primary/35 px-3 md:px-4 py-1 md:py-1.5 rounded-full inline-flex items-center gap-2 md:gap-2.5 shadow-lg shadow-primary/15">
                        <Flame size={11} className="md:size-4.5 text-primary fill-primary animate-pulse" />
                        <span className="text-primary text-[8px] md:text-[9px] font-bold uppercase tracking-[0.18em]">{heroBadge}</span>
                      </div>
                    </div>

                    <h1
                      style={{ fontWeight: 900 }}
                      className="home-hero-title text-[28px] sm:text-[34px] md:text-[52px] lg:text-[60px] font-display text-white leading-[0.94] md:leading-[0.88] tracking-tight uppercase mb-2 md:mb-4 drop-shadow-2xl max-w-xl"
                    >
                      {heroTitleLine1} <br />
                      <span className="text-primary text-outline-white">{heroTitleLine2}</span>
                    </h1>

                    <p className="home-hero-copy line-clamp-2 text-xs sm:text-sm md:text-[15px] text-slate-200 font-medium max-w-lg leading-relaxed">
                      {heroDescription}
                    </p>
                  </div>

                  <div className="home-hero-actions hidden md:flex flex-col sm:flex-row items-center gap-2 md:gap-6 pt-2 md:pt-4">
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

          {highlightedProducts.length > 0 && activeCategory === "all" && !searchTerm.trim() && (
            <section className="space-y-3 md:space-y-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-primary font-black">Escolhas rápidas</p>
                  <h2 className="mt-1 text-lg md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Mais pedidos</h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 md:hidden">Deslize para ver</span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-2 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-5 md:overflow-visible snap-x snap-mandatory no-scrollbar">
                {highlightedProducts.slice(0, 4).map((product: any) => (
                  <div key={product.id} className="min-w-[78vw] max-w-[340px] sm:min-w-[52vw] md:min-w-0 md:max-w-none snap-start">
                    <HighlightProductCard product={product} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="h-px w-full bg-slate-200/60 my-6 md:my-10" />

          <section id="menu-section" className="mt-4 md:mt-8">
            <div className="space-y-6 md:space-y-8">
              <div className="contents xl:flex xl:items-end xl:justify-between xl:gap-6">
                <div className="home-section-heading space-y-1 md:space-y-2 shrink-0">
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.24em] text-primary font-black">Vitrine da casa</p>
                  <h2 className="text-2xl md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Nosso Cardápio</h2>
                  <div className="h-1 md:h-1.5 w-24 bg-primary rounded-full" />
                </div>

                <div className="sticky top-[56px] z-40 flex items-center gap-3 overflow-x-auto border-y border-slate-200 bg-slate-50/95 py-1.5 pb-1 backdrop-blur no-scrollbar -mx-4 px-4 scroll-smooth w-auto max-w-[calc(100%+2rem)] md:static md:z-auto md:gap-8 md:border-0 md:bg-transparent md:py-0 md:pb-1 md:mx-0 md:px-0 md:max-w-full xl:pb-0 xl:justify-end">
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

              <p className="text-[11px] font-semibold text-slate-500">
                {filteredProducts.length} {filteredProducts.length === 1 ? "produto disponível" : "produtos disponíveis"}
                {searchTerm ? ` para “${searchTerm}”` : ""}
              </p>

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
                  <p className="text-slate-500 font-medium text-sm md:text-lg uppercase tracking-[0.14em]">
                    {searchTerm ? `Nenhum item encontrado para "${searchTerm}"` : "Nenhum item encontrado nesta categoria."}
                  </p>
                  {searchTerm && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchTerm("")}
                      className="rounded-xl"
                    >
                      Limpar Busca
                    </Button>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>

        <Footer settings={settings} />
      </div>
    </div>
  );
}
