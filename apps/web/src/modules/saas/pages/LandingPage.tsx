import Link from "next/link";
import { 
  Utensils, 
  ChevronRight, 
  Smartphone, 
  BarChart3, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  Star
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary selection:text-white flex flex-col">
      {/* Header / Navbar */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="container mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Utensils className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase italic">
              Food<span className="text-primary">System</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-10 font-bold text-sm uppercase tracking-widest text-slate-500">
            <a href="#features" className="hover:text-primary transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Planos</a>
            <a href="#about" className="hover:text-primary transition-colors">Sobre</a>
          </nav>

          <div className="flex items-center gap-4">
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
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="container mx-auto max-w-7xl px-4 relative z-10">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] mb-8"
              >
                <Star size={12} className="fill-primary" /> A plataforma SaaS definitiva para delivery
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-8 uppercase"
              >
                Sua loja online em <span className="text-primary italic">minutos.</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed mb-10 max-w-xl"
              >
                Gerencie pedidos, produtos e clientes em uma plataforma multi-tenant robusta. 
                Escalável, rápida e pronta para o seu sucesso.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link 
                  href="/admin/register" 
                  className="bg-primary text-white h-20 px-10 rounded-[2rem] font-black text-lg uppercase tracking-tight hover:scale-105 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3"
                >
                  Começar agora <Zap size={24} />
                </Link>
                <Link 
                  href="#demo" 
                  className="bg-slate-50 text-slate-900 h-20 px-10 rounded-[2rem] font-black text-lg uppercase tracking-tight hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
                >
                  Ver Demo
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Background Decorativo */}
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-slate-100 rounded-full blur-3xl -z-10" />
        </section>

        {/* Stats Section */}
        <section className="bg-slate-900 py-16">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Lojas Ativas", val: "500+" },
                { label: "Pedidos/Mês", val: "100k" },
                { label: "Uptime", val: "99.9%" },
                { label: "Suporte", val: "24/7" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
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
              <div key={i} className="bg-slate-50 p-12 rounded-[3.5rem] border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all group">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-primary group-hover:text-white transition-all mb-8">
                  <feature.icon size={32} />
                </div>
                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">{feature.title}</h4>
                <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social Proof */}
        <section className="bg-slate-50 py-32 overflow-hidden border-y border-slate-100">
             <div className="flex animate-marquee whitespace-nowrap gap-20 items-center">
                {[1,2,3,4,5,6,7,8].map((i) => (
                    <div key={i} className="flex items-center gap-3 opacity-30 invert grayscale">
                        <div className="w-10 h-10 bg-slate-900 rounded-lg" />
                        <span className="text-2xl font-black uppercase tracking-tighter">PARCEIRO_{i}</span>
                    </div>
                ))}
                {/* Repetir para o loop */}
                {[1,2,3,4,5,6,7,8].map((i) => (
                    <div key={i+10} className="flex items-center gap-3 opacity-30 invert grayscale">
                        <div className="w-10 h-10 bg-slate-900 rounded-lg" />
                        <span className="text-2xl font-black uppercase tracking-tighter">PARCEIRO_{i}</span>
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
