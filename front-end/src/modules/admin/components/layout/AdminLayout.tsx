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
  Tags,
  ExternalLink,
  Users
} from "lucide-react";
import { cn } from "../../../../shared/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { useSettings } from "../../../../core/hooks/useSettings";
import { useState, useEffect } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();
  const [slug, setSlug] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const storeLabel = settings?.storeName || "Master Admin";

  useEffect(() => {
    setSlug(getTenantSlug());

    const userData = localStorage.getItem("@FoodSystem:user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUserRole(parsedUser.role || "");
      } catch {
        setUserRole("");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("@FoodSystem:token");
    localStorage.removeItem("@FoodSystem:user");
    localStorage.removeItem("@FoodSystem:restaurant");
    router.push("/admin/login");
  };

  let menuItems = [
    { icon: LayoutDashboard, label: "Painel", path: "/admin" },
    { icon: ShoppingBag, label: "Pedidos", path: "/admin/orders" },
    { icon: Package, label: "Produtos", path: "/admin/products" },
    { icon: Tags, label: "Categorias", path: "/admin/categories" },
    { icon: Settings, label: "Configurações", path: "/admin/settings" },
  ];

  // Simplify menu for SUPER_ADMIN: only show core management views
  if (userRole === 'SUPER_ADMIN') {
    menuItems = [
      { icon: LayoutDashboard, label: "Painel", path: "/admin" },
      { icon: Users, label: "Clientes", path: "/admin/clients" },
      { icon: ExternalLink, label: "Auditoria", path: "/admin/audit" },
      { icon: Settings, label: "Configurações", path: "/admin/settings" },
    ];
  }

  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : '';

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex">
      {/* Sidebar Modernizada - Nível Visual Premium */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-60 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-100 flex flex-col h-screen z-70 transition-transform duration-500 lg:sticky lg:translate-x-0 lg:z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-10 pb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings?.logo ? (
                <img src={settings.logo} alt="Logo" className="w-12 h-12 rounded-[1.25rem] object-cover shadow-2xl shadow-slate-200" />
            ) : (
                <div className="w-12 h-12 bg-slate-950 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-slate-950/20">
                    <Package className="text-white" size={24} />
                </div>
            )}
            <div className="flex flex-col">
                <span className="text-heading-3 font-display font-bold tracking-tight text-slate-950 uppercase leading-none">
                    {settings?.storeName?.split(' ')[0] || "Food"}
                </span>
                <span className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mt-1">SISTEMA</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center justify-between px-6 h-16 rounded-[1.25rem] transition-all group font-body font-bold text-label uppercase tracking-[0.08em]",
                  isActive 
                    ? "bg-slate-950 text-white shadow-2xl shadow-slate-950/20" 
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-950"
                )}
              >
                <div className="flex items-center gap-4">
                  <item.icon size={20} className={cn(
                    "transition-colors",
                    isActive ? "text-primary" : "text-slate-200 group-hover:text-primary"
                  )} />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                    <motion.div layoutId="nav-active-dot" className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Ver Loja */}
        <div className="px-8 mb-4">
            <a 
                href={storeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-3 w-full h-14 bg-white border border-slate-100 text-slate-400 rounded-2xl text-label font-body font-bold uppercase tracking-[0.06em] hover:bg-slate-50 hover:border-primary/20 hover:text-primary transition-all shadow-sm"
            >
                Acessar Vitrine <ExternalLink size={14} />
            </a>
        </div>

        <div className="p-8 border-t border-slate-50">
           <div className="bg-slate-50 rounded-4xl p-5 flex items-center gap-4 mb-6 border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center shadow-sm">
                    <User size={20} className="text-slate-200" />
                </div>
                <div className="truncate">
                    <p className="text-body-strong font-body font-bold text-slate-950 truncate uppercase tracking-tight">Diretoria</p>
                    <p className="text-label font-body font-medium text-slate-400 tracking-[0.06em] truncate uppercase">{settings?.storeName || 'Master Admin'}</p>
                </div>
           </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 w-full px-6 h-14 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all font-body font-bold text-label uppercase tracking-[0.06em]"
          >
            <LogOut size={20} />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FDFDFD]">
        {/* Header Superior Premium */}
        <header className="h-20 lg:h-24 bg-white/80 backdrop-blur-md border-b border-slate-50 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-40 shrink-0">
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-white shadow-xl active:scale-90 transition-all"
                >
                  <LayoutDashboard size={20} />
                </button>
                <div className="hidden sm:flex items-center gap-4">
                  <h2 className="text-label font-body font-medium text-slate-300 uppercase tracking-[0.06em]">Hub Administrativo</h2>
                  <ChevronRight size={14} className="text-slate-200" />
                </div>
                <span className="text-body-strong font-body font-bold text-slate-950 uppercase tracking-tight">
                    {menuItems.find(m => m.path === pathname)?.label || "Visão Geral"}
                </span>
            </div>

            <div className="flex items-center gap-3 lg:gap-4">
              <div className="hidden md:flex items-center gap-3 bg-emerald-50 px-5 py-2.5 rounded-xl border border-emerald-100/50">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-label font-body font-bold text-emerald-600 uppercase tracking-[0.08em]">Marketplace Online</span>
              </div>

              <button className="flex items-center gap-3 h-12 px-4 lg:px-5 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 transition-all group shadow-sm">
                <div className="relative w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Bell size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white shadow-sm" />
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.24em]">Avisos</span>
                  <span className="text-[11px] font-bold text-slate-950 uppercase tracking-[0.08em]">1 pendência</span>
                </div>
              </button>

              <button className="flex items-center gap-3 h-12 px-4 lg:px-5 rounded-2xl bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary shrink-0">
                  <User size={18} />
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none min-w-0">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.24em]">Perfil</span>
                  <span className="text-[11px] font-bold text-white uppercase tracking-[0.08em] truncate max-w-40">{storeLabel}</span>
                </div>
              </button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 no-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {children}
            </motion.div>

            <footer className="mt-20 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 pb-12">
              <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.08em]">
                &copy; {new Date().getFullYear()} {settings?.storeName?.toUpperCase() || 'FOOD SYSTEM'}. EXPERIÊNCIA ADMINISTRATIVA PREMIUM.
              </p>
              <div className="flex items-center gap-2 text-label font-mono font-medium text-slate-300 uppercase tracking-tighter">
                <span>Engined by</span>
                <span className="text-slate-950 font-bold ml-1">FOODSYSTEM.CORE</span>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
