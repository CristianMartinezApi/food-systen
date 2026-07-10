"use client";

import { useState, useMemo, useEffect } from "react";
import { useProducts } from "../hooks/useProducts";
import { Header } from "../components/layout/Header";
import { NavSidebar } from "../components/layout/NavSidebar";
import { Footer } from "../components/layout/Footer";
import { ProductCard } from "../components/product/ProductCard";
import { Button } from "../../../shared/components/ui/button";
import { useSettings } from "../../../core/hooks/useSettings";
import { Utensils, ArrowRight, Flame, RefreshCw, MessageCircle, Phone, AlertTriangle } from "lucide-react";
import { cn } from "../../../shared/utils";
import { AnimatePresence, motion } from "framer-motion";
import { sendToWhatsApp } from "../../../shared/utils/whatsapp";

export default function Home() {
  const { products, categories, isLoading: productsLoading, error: productsError } = useProducts() as any;
  const { settings, isLoading: settingsLoading, error: settingsError } = useSettings();
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Efeito para controlar o Splash de forma estável (só sai, nunca volta)
  useEffect(() => {
    if (!settingsLoading && !productsLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500); // Tempo mínimo para a animação ser apreciada
      return () => clearTimeout(timer);
    }
  }, [settingsLoading, productsLoading]);

  useEffect(() => {
    const maxWaitTimer = setTimeout(() => {
      setShowSplash(false);
    }, 8000);

    return () => clearTimeout(maxWaitTimer);
  }, []);

  const hasStoreLoadError = !showSplash && (Boolean(settingsError) || Boolean(productsError));
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
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-primary selection:text-white overflow-x-hidden">
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-slate-950 flex items-center justify-center px-6"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_34%),radial-gradient(circle_at_20%_90%,rgba(56,189,248,0.12),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.985),rgba(2,6,23,0.99))]" />

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
                className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-white/6 border border-white/0 backdrop-blur-xl flex items-center justify-center shadow-xl shadow-black/25 mb-7 p-1"
              >
                <img
                  src="/logo.foodsystem.png"
                  alt="Logo FoodSystem"
                  className="w-full h-full object-contain rounded-[1.1rem]"
                  loading="eager"
                  decoding="async"
                />
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

              <div className="mt-10 relative h-1 w-64 overflow-hidden rounded-full bg-white/10 border border-white/0">
                <motion.div
                  initial={{ x: "-60%" }}
                  animate={{ x: "120%" }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-linear-to-r from-transparent via-amber-400 to-transparent opacity-90"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("flex flex-col flex-1 transition-opacity duration-700", showSplash ? "opacity-0" : "opacity-100")}>
        <div className="home-header">
          <Header
            settings={settings}
            onOpenMenu={() => setIsNavOpen(true)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
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
                    loading="eager"
                    decoding="async"
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

        <Footer />
      </div>
    </div>
  );
}
