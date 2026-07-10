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
  Users,
  CreditCard,
  Wallet,
  ShieldCheck,
  Grid3X3,
  Utensils
} from "lucide-react";
import { cn } from "../../../../shared/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { useSettings } from "../../../../core/hooks/useSettings";
import { api } from "../../../../core/config/api";
import { socket } from "../../../../core/config/socket";
import { useState, useEffect, useMemo, useRef } from "react";
import packageJson from "../../../../../package.json";

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
  const [userName, setUserName] = useState<string>("");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [isNoticesOpen, setIsNoticesOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUserNotice[]>([]);
  const [pendingRestaurants, setPendingRestaurants] = useState<PendingRestaurantNotice[]>([]);
  const [provisioningStatusTotals, setProvisioningStatusTotals] = useState<Record<string, number>>({
    PENDING: 0,
    IN_PROGRESS: 0,
    PAUSED: 0,
    DENIED: 0,
  });
  const [noticesLoading, setNoticesLoading] = useState(false);
  const noticesRef = useRef<HTMLDivElement>(null);
  const storeLabel = settings?.storeName || "Master Admin";
  const appVersion = `v${packageJson.version}`;
  const footerBadgeLabel = useMemo(() => {
    const name = (settings?.storeName || "Food System").trim();
    const tokens = name.split(/\s+/).filter(Boolean).slice(0, 2);
    const initials = tokens.map((token: string) => token.charAt(0).toUpperCase()).join("");
    return initials || "FS";
  }, [settings?.storeName]);

  useEffect(() => {
    setSlug(getTenantSlug());

    const userData = localStorage.getItem("@FoodSystem:user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUserRole(parsedUser.role || "");
        setUserName(parsedUser.name || "");
      } catch {
        setUserRole("");
        setUserName("");
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
        const [usersResponse, provisioningSummary] = await Promise.all([
          api.get('/admin/users?filter=pending&page=1&perPage=1'),
          api.get('/admin/provisioning/summary')
        ]);

        const totalPendingUsers = Number(usersResponse?.total || 0);
        const totalPendingRestaurants = Number(provisioningSummary?.total || 0);
        const totalPending = totalPendingUsers + totalPendingRestaurants;

        setPendingCount(totalPending);
        setProvisioningStatusTotals(provisioningSummary?.statusTotals || {
          PENDING: 0,
          IN_PROGRESS: 0,
          PAUSED: 0,
          DENIED: 0,
        });
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
      const [usersResponse, provisioningSummary] = await Promise.all([
        api.get('/admin/users?filter=pending&page=1&perPage=5'),
        api.get('/admin/provisioning/summary')
      ]);

      setPendingUsers((usersResponse?.data || []).map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        restaurant: user.restaurant,
        createdAt: user.createdAt,
      })));

      setPendingRestaurants((provisioningSummary?.restaurants || []).slice(0, 5));
      setProvisioningStatusTotals(provisioningSummary?.statusTotals || {
        PENDING: 0,
        IN_PROGRESS: 0,
        PAUSED: 0,
        DENIED: 0,
      });
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
    router.push("/login");
  };

  let menuItems = [
    { icon: LayoutDashboard, label: "Painel", path: "/admin" },
    { icon: Utensils, label: "Garçom", path: "/admin/garcom" },
    { icon: ShieldCheck, label: "Operação", path: "/admin/operacao" },
    { icon: Wallet, label: "Caixa", path: "/admin/caixa" },
    { icon: Grid3X3, label: "Mesas", path: "/admin/tables" },
    { icon: ShoppingBag, label: "Pedidos", path: "/admin/orders" },
    { icon: Package, label: "Produtos", path: "/admin/products" },
    { icon: Tags, label: "Categorias", path: "/admin/categories" },
    { icon: Settings, label: "Configurações", path: "/admin/settings" },
  ];

  // Restrict menu for EMPLOYEE (Waiters)
  if (userRole === 'EMPLOYEE') {
    menuItems = [
      { icon: Utensils, label: "Garçom", path: "/admin/garcom" },
    ];
  }

  // Restrict menu for CASHIER
  if (userRole === 'CASHIER') {
    menuItems = [
      { icon: Wallet, label: "Caixa", path: "/admin/caixa" },
      { icon: Utensils, label: "Garçom", path: "/admin/garcom" },
      { icon: Grid3X3, label: "Mesas", path: "/admin/tables" },
      { icon: ShoppingBag, label: "Pedidos", path: "/admin/orders" },
    ];
  }

  // Simplify menu for SUPER_ADMIN: only show core management views
  if (userRole === 'SUPER_ADMIN') {
    menuItems = [
      { icon: LayoutDashboard, label: "Painel", path: "/admin" },
      { icon: Users, label: "Clientes", path: "/admin/clients" },
      { icon: CreditCard, label: "Planos", path: "/admin/plans" },
      { icon: ExternalLink, label: "Auditoria", path: "/admin/audit" },
      { icon: Settings, label: "Provisionamento", path: "/admin/provisioning" },
    ];
  }

  const roleLabels: Record<string, string> = {
    "SUPER_ADMIN": "Master",
    "OWNER": "Proprietário",
    "MANAGER": "Gerente",
    "CASHIER": "Operador de Caixa",
    "EMPLOYEE": "Funcionário"
  };

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
        "fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-100 flex flex-col h-screen overflow-y-auto z-70 transition-transform duration-500 lg:sticky lg:translate-x-0 lg:z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-10 pb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings?.logo ? (
              <img src={settings.logo} alt="Logo" className="w-12 h-12 rounded-[1.25rem] object-cover shadow-2xl shadow-slate-200" />
            ) : (
              <div className="w-12 h-12 bg-slate-950 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-slate-950/20">
                <Utensils className="text-white" size={24} />
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
                  "flex items-center justify-between px-4 sm:px-6 h-12 sm:h-14 lg:h-16 rounded-[1.25rem] transition-all group font-body font-bold text-[11px] sm:text-label uppercase tracking-[0.08em]",
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
              className="flex items-center justify-center gap-3 w-full h-12 sm:h-14 bg-white border border-slate-100 text-slate-400 rounded-2xl text-[11px] sm:text-label font-body font-bold uppercase tracking-[0.06em] hover:bg-slate-50 hover:border-primary/20 hover:text-primary transition-all shadow-sm"
            >
              Acessar Vitrine <ExternalLink size={14} />
            </a>
          </div>
        )}

        <div className="p-8 border-t border-slate-50">
          <div className="bg-slate-50 rounded-4xl p-5 flex items-center gap-4 mb-6 border border-slate-100 shadow-inner">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
              <User size={22} className="text-slate-900" />
            </div>
            <div className="truncate flex-1">
              <p className="text-body-strong font-display font-bold text-slate-950 truncate uppercase tracking-tight leading-none mb-1">
                {userName || "Operador"}
              </p>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none",
                  userRole === "SUPER_ADMIN" ? "bg-slate-950 text-white" :
                  userRole === "OWNER" ? "bg-emerald-100 text-emerald-800" :
                  userRole === "MANAGER" ? "bg-amber-100 text-amber-800" :
                  "bg-slate-100 text-slate-600"
                )}>
                  {roleLabels[userRole] || userRole}
                </span>
                <p className="text-[10px] font-body font-medium text-slate-400 tracking-[0.06em] truncate uppercase">
                  {settings?.storeName || 'Food System'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 w-full px-4 sm:px-6 h-12 sm:h-14 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all font-body font-bold text-[11px] sm:text-label uppercase tracking-[0.06em]"
          >
            <LogOut size={20} />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#FDFDFD]">
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
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {['PENDING', 'IN_PROGRESS', 'PAUSED', 'DENIED'].map((status) => {
                        const labelMap: Record<string, string> = {
                          PENDING: 'Pendente',
                          IN_PROGRESS: 'Em andamento',
                          PAUSED: 'Pausado',
                          DENIED: 'Negado',
                        };
                        const colorMap: Record<string, string> = {
                          PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
                          IN_PROGRESS: 'bg-sky-50 text-sky-700 border-sky-100',
                          PAUSED: 'bg-slate-50 text-slate-700 border-slate-100',
                          DENIED: 'bg-rose-50 text-rose-700 border-rose-100',
                        };

                        return (
                          <div key={status} className={`rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] ${colorMap[status]}`}>
                            <div className="text-slate-500">{labelMap[status]}</div>
                            <div className="mt-1 text-xl text-slate-950">{provisioningStatusTotals[status] ?? 0}</div>
                          </div>
                        );
                      })}
                    </div>

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

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 no-scrollbar">
          <div className="max-w-430 mx-auto w-full min-h-full flex flex-col">
            <motion.div
              className="flex-1"
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {children}
            </motion.div>

            <footer className="mt-auto pb-10 lg:pb-12 border-t border-slate-100 pt-6 lg:pt-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="mt-2 flex items-center gap-3 min-w-0">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-700 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-sm">
                      {footerBadgeLabel}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-[0.16em] truncate">
                        {settings?.storeName?.toUpperCase() || 'FOOD SYSTEM'}
                      </p>
                      <p className="mt-1 text-[11px] sm:text-label font-medium text-slate-400 uppercase tracking-[0.08em] truncate">
                        Painel administrativo oficial • operação, controle e performance
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Sistema online</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Versão</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">{appVersion}</span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
