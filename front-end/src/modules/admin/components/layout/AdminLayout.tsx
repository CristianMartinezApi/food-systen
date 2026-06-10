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
import { api } from "../../../../core/config/api";
import { socket } from "../../../../core/config/socket";
import { useState, useEffect, useMemo, useRef } from "react";

type PendingUserNotice = {
  id: number;
  name: string;
  email: string;
  restaurant?: { name?: string | null } | null;
  createdAt: string;
};

type PendingRestaurantNotice = {
  id: number;
  name: string;
  slug: string;
  provisioningStatus: string;
  createdAt: string;
};

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
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [isNoticesOpen, setIsNoticesOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUserNotice[]>([]);
  const [pendingRestaurants, setPendingRestaurants] = useState<PendingRestaurantNotice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const noticesRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!userRole) return;

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [userRole]);

  useEffect(() => {
    if (userRole !== 'SUPER_ADMIN') {
      setPendingCount(null);
      setPendingUsers([]);
      setPendingRestaurants([]);
      return;
    }

    const loadPendingCount = async () => {
      try {
        const [usersResponse, restaurantsResponse] = await Promise.all([
          api.get('/admin/users?filter=pending&page=1&perPage=1'),
          api.get('/admin/provisioning')
        ]);

        const totalPendingUsers = Number(usersResponse?.total || 0);
        const totalPendingRestaurants = (restaurantsResponse || []).filter((restaurant: PendingRestaurantNotice) =>
          ['PENDING', 'IN_PROGRESS', 'PAUSED', 'DENIED'].includes(restaurant.provisioningStatus)
        ).length;
        const totalPending = totalPendingUsers + totalPendingRestaurants;

        setPendingCount(totalPending);
      } catch {
        setPendingCount(0);
      }
    };

    loadPendingCount();
  }, [userRole]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (noticesRef.current && !noticesRef.current.contains(event.target as Node)) {
        setIsNoticesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const noticeSummary = useMemo(() => {
    const total = (pendingUsers.length || 0) + (pendingRestaurants.length || 0);

    if (userRole !== 'SUPER_ADMIN') {
      return { label: 'Sem alertas', count: 0 };
    }

    if (noticesLoading) {
      return { label: 'Carregando...', count: pendingCount ?? 0 };
    }

    if (pendingCount === null) {
      return { label: 'Carregando...', count: 0 };
    }

    if (pendingCount === 0) {
      return { label: 'Sem pendências', count: 0 };
    }

    return {
      label: `${pendingCount} pendência${pendingCount > 1 ? 's' : ''}`,
      count: total,
    };
  }, [userRole, noticesLoading, pendingCount, pendingUsers.length, pendingRestaurants.length]);

  const openNotices = async () => {
    if (userRole !== 'SUPER_ADMIN') return;

    setIsNoticesOpen((current) => !current);

    if (pendingCount === 0 || noticesLoading || (pendingUsers.length > 0 || pendingRestaurants.length > 0)) {
      return;
    }

    setNoticesLoading(true);
    try {
      const [usersResponse, restaurantsResponse] = await Promise.all([
        api.get('/admin/users?filter=pending&page=1&perPage=5'),
        api.get('/admin/provisioning')
      ]);

      setPendingUsers((usersResponse?.data || []).map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        restaurant: user.restaurant,
        createdAt: user.createdAt,
      })));

      setPendingRestaurants(
        (restaurantsResponse || [])
          .filter((restaurant: PendingRestaurantNotice) => ['PENDING', 'IN_PROGRESS', 'PAUSED', 'DENIED'].includes(restaurant.provisioningStatus))
          .slice(0, 5)
      );
    } catch {
      setPendingUsers([]);
      setPendingRestaurants([]);
    } finally {
      setNoticesLoading(false);
    }
  };

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
      { icon: Settings, label: "Provisionamento", path: "/admin/provisioning" },
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
        {userRole !== 'SUPER_ADMIN' && (
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
        )}

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

              <div ref={noticesRef} className="relative">
                <button
                  onClick={openNotices}
                  className="flex items-center gap-3 h-12 px-4 lg:px-5 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 transition-all group shadow-sm disabled:cursor-default"
                  disabled={userRole !== 'SUPER_ADMIN'}
                >
                <div className="relative w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Bell size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                  {pendingCount && pendingCount > 0 ? (
                    <span className="absolute top-2 right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-[10px] font-black leading-4 text-white border-2 border-white shadow-sm text-center">
                      {pendingCount}
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-slate-200 rounded-full border-2 border-white shadow-sm" />
                  )}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.24em]">Avisos</span>
                  <span className="text-[11px] font-bold text-slate-950 uppercase tracking-[0.08em]">
                    {noticeSummary.label}
                  </span>
                </div>
                </button>

                {isNoticesOpen && userRole === 'SUPER_ADMIN' && (
                  <div className="absolute right-0 top-14 z-50 w-[min(92vw,28rem)] rounded-3xl border border-slate-100 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">Avisos reais</p>
                        <h3 className="mt-1 text-sm font-black uppercase tracking-tight text-slate-950">Pendências que exigem ação</h3>
                      </div>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                        {pendingCount ?? 0}
                      </span>
                    </div>

                    <div className="max-h-96 overflow-auto p-4 space-y-4">
                      {noticesLoading ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          Carregando pendências...
                        </div>
                      ) : pendingCount === 0 ? (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-6 text-sm font-medium text-emerald-700">
                          Nenhuma pendência aberta no momento.
                        </div>
                      ) : (
                        <>
                          <section className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Usuários pendentes</h4>
                              <button onClick={() => router.push('/admin/clients')} className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Ver todos</button>
                            </div>
                            {pendingUsers.length === 0 ? (
                              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">Nenhum usuário aguardando aprovação.</div>
                            ) : pendingUsers.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => router.push('/admin/clients?filter=pending')}
                                className="w-full text-left rounded-2xl border border-slate-100 bg-white px-4 py-3 hover:border-primary/20 hover:bg-primary/5 transition-all"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-950 truncate">{user.name}</p>
                                    <p className="mt-0.5 text-xs text-slate-500 truncate">{user.email}</p>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                      {user.restaurant?.name ? `Loja: ${user.restaurant.name}` : 'Sem loja vinculada'}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Aprovar</span>
                                </div>
                              </button>
                            ))}
                          </section>

                          <section className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Lojas em atenção</h4>
                              <button onClick={() => router.push('/admin/provisioning')} className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Provisionamento</button>
                            </div>
                            {pendingRestaurants.length === 0 ? (
                              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">Nenhuma loja em fila ou pausa.</div>
                            ) : pendingRestaurants.map((restaurant) => (
                              <button
                                key={restaurant.id}
                                onClick={() => router.push('/admin/provisioning')}
                                className="w-full text-left rounded-2xl border border-slate-100 bg-white px-4 py-3 hover:border-primary/20 hover:bg-primary/5 transition-all"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-950 truncate">{restaurant.name}</p>
                                    <p className="mt-0.5 text-xs text-slate-500 truncate">Slug: {restaurant.slug}</p>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Status: {restaurant.provisioningStatus}</p>
                                  </div>
                                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">Abrir</span>
                                </div>
                              </button>
                            ))}
                          </section>
                        </>
                      )}
                    </div>

                    <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 flex items-center justify-between gap-3">
                      <button onClick={() => router.push('/admin/clients?filter=pending')} className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 transition-colors">
                        Gerenciar usuários
                      </button>
                      <button onClick={() => router.push('/admin/provisioning')} className="text-xs font-black uppercase tracking-[0.16em] text-primary hover:opacity-80 transition-colors">
                        Abrir provisionamento
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
