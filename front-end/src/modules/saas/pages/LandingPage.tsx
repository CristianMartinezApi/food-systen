"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Utensils, 
  Smartphone, 
  BarChart3, 
  Zap, 
  ShieldCheck, 
  ArrowRight
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSettings } from "../../../core/hooks/useSettings";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const { settings } = useSettings();

  const bannerBadge = settings?.bannerBadge ?? "Plataforma completa para restaurantes e dark kitchens";
  const bannerTitle = settings?.bannerTitleLine1 || settings?.bannerTitleLine2
    ? `${settings?.bannerTitleLine1 ?? ""}${settings?.bannerTitleLine2 ? ` ${settings?.bannerTitleLine2}` : ""}`.trim()
    : "A plataforma que vende por você — operação, entrega e pagamentos.";
  const bannerDescription = settings?.bannerDescription ?? "Aceite pedidos via web e app, gerencie cardápio e promoções, controle entregas e comissões em um painel único. Reduza chamadas, aumente ticket médio e automatize sua operação.";
  const bannerCta = settings?.bannerCtaLabel ?? "Teste grátis — 14 dias";
  const bannerImage = settings?.bannerImage ?? "/hero-illustration.png";
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".landing-nav", {
        y: -24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
      })
        .from(".landing-hero-badge", {
          y: 20,
          opacity: 0,
          duration: 0.55,
        }, "-=0.25")
        .from(".landing-hero-title", {
          y: 36,
          opacity: 0,
          duration: 0.85,
        }, "-=0.18")
        .from(".landing-hero-copy", {
          y: 24,
          opacity: 0,
          duration: 0.7,
        }, "-=0.5")
        .from(".landing-hero-actions", {
          y: 20,
          opacity: 0,
          duration: 0.65,
        }, "-=0.42")
        .from(".landing-bg-orb", {
          scale: 0.75,
          opacity: 0,
          duration: 0.9,
          stagger: 0.12,
        }, "-=0.7");

      gsap.from(".landing-stat", {
        scrollTrigger: {
          trigger: ".landing-stats",
          start: "top 80%",
        },
        y: 24,
        opacity: 0,
        duration: 0.65,
        stagger: 0.12,
        ease: "power3.out",
      });

      gsap.from(".landing-feature", {
        scrollTrigger: {
          trigger: "#features",
          start: "top 72%",
        },
        y: 36,
        opacity: 0,
        duration: 0.75,
        stagger: 0.12,
        ease: "power3.out",
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary selection:text-white flex flex-col">
      {/* Header / Navbar */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="container mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
          <Link href="/" className="landing-nav flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Utensils className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase italic">
              Food<span className="text-primary">System</span>
            </span>
          </Link>

          <nav className="landing-nav hidden md:flex items-center gap-10 font-bold text-sm uppercase tracking-widest text-slate-500">
            <a href="#features" className="hover:text-primary transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Planos</a>
            <a href="#about" className="hover:text-primary transition-colors">Sobre</a>
          </nav>

          <div className="landing-nav flex items-center gap-4">
            <Link href="/admin/login" className="hidden sm:block text-slate-500 font-bold hover:text-slate-900 transition-colors uppercase text-xs tracking-widest">
              Entrar
            </Link>
            <Link 
              href="/admin/register" 
              className="bg-slate-900 text-white px-6 h-12 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
            >
              Criar Loja <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-20 flex-1">
        {/* Hero Section - atualizado para versão mais profissional */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="container mx-auto max-w-7xl px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-2xl">
                <div className="landing-hero-badge inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.18em] mb-6">
                  <Zap size={12} className="fill-primary" /> {bannerBadge}
                </div>

                <h1 className="landing-hero-title text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-tight mb-6">
                  {bannerTitle}
                </h1>

                <p className="landing-hero-copy text-base md:text-lg text-slate-600 font-medium leading-relaxed mb-6 max-w-xl">
                  {bannerDescription}
                </p>

                <div className="landing-hero-actions flex flex-col sm:flex-row gap-4 mb-6">
                  <Link href="/admin/register" className="bg-primary text-white h-14 px-8 rounded-3xl font-black text-lg uppercase tracking-tight hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-3">
                    {bannerCta} <Zap size={18} />
                  </Link>
                  <Link href="#demo" className="border border-slate-100 text-slate-900 h-14 px-8 rounded-3xl font-black text-lg uppercase tracking-tight hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                    Agendar demo
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary font-black">1</div>
                    <div>
                      <p className="font-bold text-sm">Cardápio Online</p>
                      <p className="text-xs text-slate-500">Personalize categorias, variações e combos.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary font-black">2</div>
                    <div>
                      <p className="font-bold text-sm">Gestão de Pedidos</p>
                      <p className="text-xs text-slate-500">Fila inteligente, preparação e integração com entregas.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary font-black">3</div>
                    <div>
                      <p className="font-bold text-sm">Relatórios</p>
                      <p className="text-xs text-slate-500">Vendas, campanhas e performance por canal.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ilustração / imagem do produto */}
              <div className="flex items-center justify-center lg:justify-end">
                <div className="w-full max-w-lg bg-gradient-to-br from-white to-slate-50 rounded-3xl p-8 shadow-2xl">
                    <div className="w-full h-64 bg-center bg-cover rounded-2xl" style={{ backgroundImage: `url(${bannerImage})` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Background Decorativo simplificado */}
          <div className="landing-bg-orb absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-80 h-80 bg-primary/6 rounded-full blur-3xl -z-10" />
          <div className="landing-bg-orb absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-60 h-60 bg-slate-100 rounded-full blur-3xl -z-10" />
        </section>

        {/* Stats Section */}
        <section className="bg-slate-900 py-16 landing-stats">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Lojas Ativas", val: "500+" },
                { label: "Pedidos/Mês", val: "100k" },
                { label: "Uptime", val: "99.9%" },
                { label: "Suporte", val: "24/7" },
              ].map((stat, i) => (
                <div key={i} className="landing-stat text-center">
                  <p className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-2">{stat.val}</p>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32">
          <div className="container mx-auto max-w-7xl px-4 text-center mb-24">
            <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4">Funcionalidades</h2>
            <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
              Tudo o que você precisa <br/> para <span className="text-primary italic">dominar</span> o mercado.
            </h3>
          </div>

          <div className="container mx-auto max-w-7xl px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: Smartphone, 
                title: "Cardápio Digital", 
                desc: "Seu cliente faz o pedido direto pelo celular, sem precisar baixar nada."
              },
              { 
                icon: BarChart3, 
                title: "Gestão Inteligente", 
                desc: "Relatórios de vendas, categorias e performance da sua loja em tempo real."
              },
              { 
                icon: ShieldCheck, 
                title: "Sua Marca, Seu Link", 
                desc: "Sua loja terá um slug exclusivo (seu-restaurante.foodsystem.com)."
              }
            ].map((feature, i) => (
              <div key={i} className="landing-feature bg-slate-50 p-12 rounded-[3.5rem] border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all group">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-primary group-hover:text-white transition-all mb-8">
                  <feature.icon size={32} />
                </div>
                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">{feature.title}</h4>
                <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* SaaS Footer */}
      <footer className="bg-white pt-32 pb-16 border-t border-slate-100">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
             <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Utensils className="text-white" size={24} />
                    </div>
                    <span className="text-2xl font-black tracking-tighter uppercase italic text-slate-900">
                    Food<span className="text-primary">System</span>
                    </span>
                </div>
                <p className="text-slate-500 font-medium max-w-sm mb-10 leading-relaxed text-lg">
                    Ajudando empreendedores da gastronomia a escalar seus negócios através da tecnologia.
                </p>
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white" />
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white" />
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white" />
                </div>
             </div>
             
             <div>
                <h5 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-8">Plataforma</h5>
                <ul className="space-y-4 font-bold text-sm text-slate-500 uppercase tracking-wider">
                    <li><a href="#" className="hover:text-primary transition-colors">Funcionalidades</a></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Marketplace</a></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Segurança</a></li>
                </ul>
             </div>

             <div>
                <h5 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-8">Empresa</h5>
                <ul className="space-y-4 font-bold text-sm text-slate-500 uppercase tracking-wider">
                    <li><a href="#" className="hover:text-primary transition-colors">Sobre</a></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Carreiras</a></li>
                </ul>
             </div>
          </div>

          <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
             <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                © 2026 FOODSYSTEM.SAAS - TODOS OS DIREITOS RESERVADOS.
             </p>
             <div className="flex gap-8 font-bold text-[10px] uppercase tracking-widest text-slate-400">
                <a href="#">Privacidade</a>
                <a href="#">Termos</a>
                <a href="#">Cookies</a>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
