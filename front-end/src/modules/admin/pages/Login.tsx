"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../core/config/api";
import { Lock, Mail, Loader2, Utensils } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { gsap } from "gsap";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from(".login-hero", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" });
      gsap.from(".login-form", { y: 28, opacity: 0, duration: 0.9, ease: "power3.out" }, "-=0.35");
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      
      localStorage.setItem("@FoodSystem:token", response.token);
      localStorage.setItem("@FoodSystem:user", JSON.stringify(response.user));
      if (response.restaurant) {
        localStorage.setItem("@FoodSystem:restaurant", JSON.stringify(response.restaurant));
      } else {
        localStorage.removeItem("@FoodSystem:restaurant");
      }
      
      toast.success("Bem-vindo de volta!");
      if (response.user.role === 'SUPER_ADMIN') {
        router.push("/admin");
      } else if (response.user.restaurantId) {
        router.push("/admin");
      } else {
        router.push("/admin/onboarding");
      }
    } catch (error: any) {
      toast.error(error.message || "Credenciais inválidas ou erro no servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="login-hero text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-4xl flex items-center justify-center shadow-xl shadow-primary/30 mx-auto mb-6">
            <Utensils className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Painel Admin</h1>
          <p className="text-slate-500 font-medium">Acesse sua conta para gerenciar sua loja</p>
        </div>

        <form onSubmit={handleLogin} className="login-form bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu E-mail</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sua Senha</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/10 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "ENTRAR NO PAINEL"}
          </button>

          <Link href="/admin/reset-password" className="block text-center text-sm text-slate-500 hover:text-primary transition-colors font-medium">
            Esqueci minha senha
          </Link>
        </form>

        <p className="text-center mt-8 text-slate-400 text-sm">
          Ainda não tem uma conta? <Link href="/admin/register" className="text-primary font-bold cursor-pointer">Cadastre sua loja</Link>
        </p>
      </div>
    </div>
  );
}
