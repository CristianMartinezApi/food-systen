import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../core/config/api";
import { Lock, Mail, Loader2, Utensils, Store, User, Globe } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    restaurantName: "",
    slug: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post("/auth/register", formData);
      
      localStorage.setItem("@FoodSystem:token", response.token);
      localStorage.setItem("@FoodSystem:user", JSON.stringify(response.user));
      localStorage.setItem("@FoodSystem:restaurant", JSON.stringify(response.restaurant));
      
      toast.success("Conta criada com sucesso!");
      router.push("/admin");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta. Verifique se o e-mail ou slug já existem.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData(prev => ({ ...prev, restaurantName: name, slug }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-[2rem] flex items-center justify-center shadow-xl shadow-primary/30 mx-auto mb-6">
            <Utensils className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Criar sua Loja</h1>
          <p className="text-slate-500 font-medium">Junte-se a centenas de restaurantes e comece a vender hoje.</p>
        </div>

        <form onSubmit={handleRegister} className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações Pessoais */}
            <div className="md:col-span-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Informações do Gestor</h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu Nome</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome completo"
                  className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu E-mail</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@exemplo.com"
                  className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sua Senha</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Informações da Loja */}
            <div className="md:col-span-2 pt-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sobre o Estabelecimento</h3>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Loja</label>
              <div className="relative">
                <Store className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  required
                  value={formData.restaurantName}
                  onChange={(e) => updateSlug(e.target.value)}
                  placeholder="Ex: Burger King"
                  className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da Loja (Slug)</label>
              <div className="relative">
                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  placeholder="ex-burger-king"
                  className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium ml-1">Sua loja será acessada em: foodsystem.com/{formData.slug || 'sua-loja'}</p>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/10 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "CRIAR MINHA LOJA"}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-400 text-sm">
          Já tem uma conta? <Link href="/admin/login" className="text-primary font-bold">Acessar Painel</Link>
        </p>
      </div>
    </div>
  );
}
