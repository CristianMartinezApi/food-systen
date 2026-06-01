import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Settings, 
  LogOut,
  ChevronRight,
  Bell,
  User,
  Tags
} from "lucide-react";
import { cn } from "../../../../shared/utils";
import { motion } from "framer-motion";

import { useSettings } from "../../../../core/hooks/useSettings";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();

  const handleLogout = () => {
    localStorage.removeItem("@FoodSystem:token");
    localStorage.removeItem("@FoodSystem:user");
    localStorage.removeItem("@FoodSystem:restaurant");
    router.push("/admin/login");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: ShoppingBag, label: "Pedidos", path: "/admin/orders" },
    { icon: Package, label: "Produtos", path: "/admin/products" },
    { icon: Tags, label: "Categorias", path: "/admin/categories" },
    { icon: Settings, label: "Configurações", path: "/admin/settings" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex">
      {/* Sidebar Modernizada */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col sticky top-0 h-screen z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3">
            {settings?.logo ? (
                <img src={settings.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg" />
            ) : (
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <Package className="text-white" size={24} />
                </div>
            )}
            <span className="text-xl font-black tracking-tighter text-slate-800">
                {settings?.storeName?.split(' ')[0] || "Food"}<span className="text-primary">{settings?.storeName?.split(' ')[1] || "Admin."}</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center justify-between px-4 h-14 rounded-2xl transition-all group font-bold",
                  isActive 
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10 active-nav" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={cn(
                    "transition-colors",
                    isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                    <motion.div layoutId="nav-chevron">
                        <ChevronRight size={16} className="text-primary/50" />
                    </motion.div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-50">
           <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 mb-4 border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center shadow-sm">
                    <User size={20} className="text-slate-400" />
                </div>
                <div className="truncate">
                    <p className="text-sm font-black text-slate-900 truncate">Gerente</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">{settings?.storeName || 'Unidade Matriz'}</p>
                </div>
           </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 h-12 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all font-bold"
          >
            <LogOut size={20} />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Header Superior Simplificado */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-50 px-8 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Painel Administrativo</h2>
                <ChevronRight size={14} className="text-slate-300" />
                <span className="text-sm font-black text-slate-900 uppercase">
                    {menuItems.find(m => m.path === location.pathname)?.label || "Início"}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center border hover:border-primary/20 transition-all group">
                    <Bell size={20} className="text-slate-500 group-hover:text-primary transition-colors" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />
                </button>
                <div className="h-8 w-px bg-slate-100 mx-2" />
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-emerald-600 uppercase">Loja On-line</span>
                </div>
            </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
