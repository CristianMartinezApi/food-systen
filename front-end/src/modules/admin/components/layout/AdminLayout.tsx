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
  Utensils,
  BarChart3,
  Menu,
  ChefHat,
  Layers,
  Ticket
} from "lucide-react";
import { cn, normalizeAssetUrl } from "../../../../shared/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { useSettings } from "../../../../core/hooks/useSettings";
import { api } from "../../../../core/config/api";
import { socket } from "../../../../core/config/socket";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import packageJson from "../../../../../package.json";
import toast from "react-hot-toast";

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

const STORE_ADMIN_ROUTES = [
  "/admin",
  "/admin/operacao",
  "/admin/tables",
  "/admin/garcom",
  "/admin/caixa",
  "/admin/orders",
  "/admin/categories",
  "/admin/products",
  "/admin/settings",
  "/admin/profile",
];

const SUPER_ADMIN_ROUTES = [
  "/admin",
  "/admin/clients",
  "/admin/plans",
  "/admin/provisioning",
  "/admin/audit",
  "/admin/profile",
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();
  const [slug, setSlug] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [userEmail, setUserEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [verificationSending, setVerificationSending] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
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
  const isStoreAdmin = ['OWNER', 'MANAGER'].includes(userRole);
  const hasEmailNotice = isStoreAdmin && !emailVerified;
  const syncEmailVerification = useCallback(async () => {
    try {
      const response = await api.get('/users/me/email-verification');
      setUserEmail(response.email || "");
      setNewEmail(response.email || "");
      setEmailVerified(Boolean(response.emailVerifiedAt));

      const stored = localStorage.getItem("@FoodSystem:user");
      if (stored) {
        const user = JSON.parse(stored);
        user.email = response.email;
        user.emailVerifiedAt = response.emailVerifiedAt;
        localStorage.setItem("@FoodSystem:user", JSON.stringify(user));
      }
    } catch {
      // Mantém o último estado conhecido se a consulta falhar temporariamente.
    }
  }, []);
  const footerBadgeLabel = useMemo(() => {
    const name = (settings?.storeName || "Food System").trim();
    const tokens = name.split(/\s+/).filter(Boolean).slice(0, 2);
    const initials = tokens.map((token: string) => token.charAt(0).toUpperCase()).join("");
    return initials || "FS";
  }, [settings?.storeName]);

  useEffect(() => {
    setSlug(getTenantSlug());

    const syncStoredUser = () => {
      const userData = localStorage.getItem("@FoodSystem:user");
      if (userData) {
        try {
        const parsedUser = JSON.parse(userData);
        setUserRole(parsedUser.role || "");
        setUserName(parsedUser.name || "");
        setUserAvatar(parsedUser.avatarUrl || "");
        setUserEmail(parsedUser.email || "");
        setNewEmail(parsedUser.email || "");
        setEmailVerified(Boolean(parsedUser.emailVerifiedAt));
        } catch {
          setUserRole("");
          setUserName("");
        }
      }
    };

    syncStoredUser();
    window.addEventListener("foodsystem:user-updated", syncStoredUser);
    return () => window.removeEventListener("foodsystem:user-updated", syncStoredUser);
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsNoticesOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isStoreAdmin) return;

    void syncEmailVerification();
    const handleFocus = () => void syncEmailVerification();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void syncEmailVerification();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isStoreAdmin, syncEmailVerification]);

  useEffect(() => {
    if (!userRole) return;

    const routes = userRole === "SUPER_ADMIN" ? SUPER_ADMIN_ROUTES : STORE_ADMIN_ROUTES;
    let cancelled = false;
    const timers: number[] = [];

    const prefetchRoutes = () => {
      routes
        .filter((route) => route !== pathname)
        .forEach((route, index) => {
          const timer = window.setTimeout(() => {
            if (!cancelled) router.prefetch(route);
          }, index * 120);
          timers.push(timer);
        });
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId = idleWindow.requestIdleCallback?.(prefetchRoutes, { timeout: 1200 });
    if (idleId === undefined) {
      timers.push(window.setTimeout(prefetchRoutes, 250));
    }

    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, [pathname, router, userRole]);

  const requestEmailVerification = async () => {
    try {
      setVerificationSending(true);
      const response = await api.post('/users/me/email-verification/request', {});
      if (response.alreadyVerified) {
        await syncEmailVerification();
      }
      toast.success(response.message);
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível enviar a confirmação');
    } finally {
      setVerificationSending(false);
    }
  };

  const updateMyEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setEmailSaving(true);
      const response = await api.patch('/users/me/email', {
        email: newEmail,
        currentPassword,
      });
      setUserEmail(response.email);
      setNewEmail(response.email);
      setEmailVerified(Boolean(response.emailVerifiedAt));
      setCurrentPassword("");
      setEditingEmail(false);

      const stored = localStorage.getItem("@FoodSystem:user");
      if (stored) {
        const user = JSON.parse(stored);
        user.email = response.email;
        user.emailVerifiedAt = response.emailVerifiedAt;
        localStorage.setItem("@FoodSystem:user", JSON.stringify(user));
      }
      toast.success(response.message || 'E-mail atualizado');
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível alterar o e-mail');
    } finally {
      setEmailSaving(false);
    }
  };

  useEffect(() => {
    if (!userRole || !slug) return;

    // Refaz o handshake para aplicar o token administrativo atual.
    if (socket.connected) socket.disconnect();
    socket.connect();

    const cashierNeededEvent = `cashier_needed_${slug}`;
    socket.on(cashierNeededEvent, (data: { customerName?: string }) => {
      toast.error(
        `⚠️ ${data?.customerName || 'Cliente'} tentou fazer um pedido — abra a Sessão de Caixa!`,
        { duration: 10000, id: 'cashier-needed' }
      );
    });

    const cashierReminderEvent = `cashier_reminder_${slug}`;
    socket.on(cashierReminderEvent, (data: { opensAt?: string; message?: string }) => {
      toast(
        data?.message || `Sua loja abre em breve! Abra a Sessão de Caixa.`,
        {
          icon: '🕐',
          duration: 30000,
          id: 'cashier-reminder',
          style: { background: '#1e293b', color: '#fff', fontWeight: 'bold' },
        }
      );
    });

    return () => {
      socket.off(cashierNeededEvent);
      socket.off(cashierReminderEvent);
      socket.disconnect();
    };
  }, [userRole, slug]);

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
      return hasEmailNotice
        ? { label: '1 pendência', count: 1 }
        : { label: 'Sem alertas', count: 0 };
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
  }, [userRole, hasEmailNotice, noticesLoading, pendingCount, pendingUsers.length, pendingRestaurants.length]);

  const openNotices = async () => {
    if (userRole !== 'SUPER_ADMIN') {
      if (isStoreAdmin) {
        await syncEmailVerification();
        setIsNoticesOpen((current) => !current);
      }
      return;
    }

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

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // A limpeza local continua mesmo se a API estiver indisponível.
    }
    localStorage.removeItem("@FoodSystem:token");
    localStorage.removeItem("@FoodSystem:user");
    localStorage.removeItem("@FoodSystem:restaurant");
    router.push("/login");
  };

  let menuItems = [
    { icon: LayoutDashboard, label: "Painel", path: "/admin" },
    { icon: ShieldCheck, label: "Turno", path: "/admin/operacao" },
    { icon: Grid3X3, label: "Mesas", path: "/admin/tables" },
    { icon: Utensils, label: "Garçom", path: "/admin/garcom" },
    { icon: ChefHat, label: "Cozinha", path: "/admin/cozinha" },
    { icon: Wallet, label: "Sessão de Caixa", path: "/admin/caixa" },
    { icon: BarChart3, label: "Relatórios", path: "/admin/relatorios" },
    { icon: ShoppingBag, label: "Pedidos", path: "/admin/orders" },
    { icon: Tags, label: "Categorias", path: "/admin/categories" },
    { icon: Package, label: "Produtos", path: "/admin/products" },
    { icon: Layers, label: "Combos", path: "/admin/combos" },
    { icon: Ticket, label: "Cupons", path: "/admin/cupons" },
    { icon: Settings, label: "Configurações", path: "/admin/settings" },
  ];

  // Restrict menu for EMPLOYEE (Waiters)
  if (userRole === 'EMPLOYEE') {
    menuItems = [
      { icon: Utensils, label: "Garçom", path: "/admin/garcom" },
      { icon: ChefHat, label: "Cozinha", path: "/admin/cozinha" },
    ];
  }

  // Restrict menu for CASHIER
  if (userRole === 'CASHIER') {
    menuItems = [
      { icon: Grid3X3, label: "Mesas", path: "/admin/tables" },
      { icon: Utensils, label: "Garçom", path: "/admin/garcom" },
      { icon: Wallet, label: "Sessão de Caixa", path: "/admin/caixa" },
      { icon: ShoppingBag, label: "Pedidos", path: "/admin/orders" },
      { icon: ChefHat, label: "Cozinha", path: "/admin/cozinha" },
    ];
  }

  // Simplify menu for SUPER_ADMIN: only show core management views
  if (userRole === 'SUPER_ADMIN') {
    menuItems = [
      { icon: LayoutDashboard, label: "Painel", path: "/admin" },
      { icon: Users, label: "Clientes", path: "/admin/clients" },
      { icon: CreditCard, label: "Planos", path: "/admin/plans" },
      { icon: Settings, label: "Provisionamento", path: "/admin/provisioning" },
      { icon: ExternalLink, label: "Auditoria", path: "/admin/audit" },
    ];
  }

  const mobilePrimaryItems = userRole === "SUPER_ADMIN"
    ? menuItems.slice(0, 4)
    : userRole === "EMPLOYEE"
      ? menuItems
      : userRole === "CASHIER"
        ? menuItems.slice(0, 4)
        : menuItems.filter((item) =>
            ["/admin", "/admin/orders", "/admin/caixa", "/admin/relatorios"].includes(item.path)
          );

  const roleLabels: Record<string, string> = {
    "SUPER_ADMIN": "Master",
    "OWNER": "Proprietário",
    "MANAGER": "Gerente",
    "CASHIER": "Operador de Caixa",
    "EMPLOYEE": "Funcionário"
  };

  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : '';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar administrativa com visual discreto */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-60 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-70 flex h-screen w-64 flex-col overflow-y-auto border-r border-slate-300 bg-slate-950 transition-transform duration-200 lg:sticky lg:z-50 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-3 min-w-0">
            {settings?.logo ? (
              <img src={settings.logo} alt="Logo" className="h-9 w-9 rounded object-cover ring-1 ring-slate-700" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-800">
                <Utensils className="text-white" size={18} />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-semibold leading-none text-white">
                {settings?.storeName?.split(' ')[0] || "Food"}
              </span>
              <span className="mt-1 text-[11px] font-medium text-slate-400">Operação administrativa</span>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-9 h-9 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 active:scale-95 transition-all"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "group flex h-10 items-center justify-between rounded px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={cn(
                    "transition-colors",
                    isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                  )} />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <motion.div layoutId="nav-active-dot" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Ver Loja */}
        {userRole !== 'SUPER_ADMIN' && (
          <div className="px-4 mb-4">
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-full items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Acessar Vitrine <ExternalLink size={14} />
            </a>
          </div>
        )}

        <div className="border-t border-slate-800 p-3">
          <div className="mb-2 flex items-center gap-3 rounded bg-slate-900 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-800">
              {userAvatar ? (
                <img src={normalizeAssetUrl(userAvatar)} alt="" className="h-full w-full object-cover" />
              ) : (
                <User size={17} className="text-slate-300" />
              )}
            </div>
            <div className="truncate flex-1">
              <p className="mb-1 truncate text-sm font-semibold leading-none text-white">
                {userName || "Operador"}
              </p>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none",
                  userRole === "SUPER_ADMIN" ? "bg-slate-900 text-white" :
                  userRole === "OWNER" ? "bg-emerald-100 text-emerald-800" :
                  userRole === "MANAGER" ? "bg-amber-100 text-amber-800" :
                  "bg-slate-100 text-slate-600"
                )}>
                  {roleLabels[userRole] || userRole}
                </span>
                <p className="text-[11px] font-medium text-slate-500 truncate">
                  {settings?.storeName || 'Food System'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-9 w-full items-center gap-3 rounded px-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-rose-300"
          >
            <LogOut size={16} />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header superior do sistema */}
        <header className="admin-topbar sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-3 lg:gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-700 active:scale-95 transition-all"
            >
              <LayoutDashboard size={16} />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <h2 className="text-xs font-medium text-slate-500">Administração</h2>
              <ChevronRight size={12} className="text-slate-300" />
            </div>
            <span className="truncate text-sm font-semibold text-slate-900">
              {menuItems.find(m => m.path === pathname)?.label || "Visão Geral"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-md border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-600">Loja online</span>
            </div>

            <div ref={noticesRef} className="relative">
              <button
                onClick={openNotices}
                className="flex items-center gap-2 h-10 px-3 rounded-md bg-white border border-slate-200 hover:bg-slate-100 transition-colors group disabled:cursor-default"
                disabled={userRole !== 'SUPER_ADMIN' && !isStoreAdmin}
              >
                <div className="relative w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                  <Bell size={15} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                  {noticeSummary.count > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-slate-900 text-[10px] font-semibold leading-4 text-white border border-white text-center">
                      {noticeSummary.count}
                    </span>
                  ) : (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-slate-300 rounded-full border border-white" />
                  )}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-[10px] font-medium text-slate-500">Avisos</span>
                  <span className="text-[11px] font-semibold text-slate-900">
                    {noticeSummary.label}
                  </span>
                </div>
              </button>

              {isNoticesOpen && isStoreAdmin && (
                <div className="fixed left-3 right-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[min(92vw,30rem)]">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Avisos da conta</p>
                    <h3 className="mt-1 text-sm font-black uppercase tracking-tight text-slate-950">Pendências que exigem ação</h3>
                  </div>
                  <div className="p-4">
                    {hasEmailNotice ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                        <p className="font-bold">Confirme seu e-mail</p>
                        <p className="mt-1 text-sm text-amber-800">
                          O link será enviado para <strong>{userEmail || 'e-mail não informado'}</strong>.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={() => setEditingEmail((value) => !value)} className="rounded-xl border border-amber-900 px-3 py-2 text-xs font-bold">
                            {editingEmail ? 'Cancelar' : 'Corrigir e-mail'}
                          </button>
                          <button type="button" disabled={verificationSending || !userEmail} onClick={requestEmailVerification} className="rounded-xl bg-amber-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
                            {verificationSending ? 'Enviando...' : 'Enviar confirmação'}
                          </button>
                        </div>
                        {editingEmail && (
                          <form onSubmit={updateMyEmail} className="mt-4 space-y-3 border-t border-amber-200 pt-4">
                            <label className="block text-xs font-bold">E-mail correto
                              <input type="email" required autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm outline-none" />
                            </label>
                            <label className="block text-xs font-bold">Senha atual
                              <input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm outline-none" />
                            </label>
                            <button type="submit" disabled={emailSaving} className="h-10 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-60">
                              {emailSaving ? 'Salvando...' : 'Salvar e-mail'}
                            </button>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                        Nenhuma pendência aberta no momento.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isNoticesOpen && userRole === 'SUPER_ADMIN' && (
                <div className="fixed left-3 right-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[min(92vw,28rem)]">
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

            <button
              onClick={() => router.push("/admin/profile")}
              className="flex items-center gap-2 h-10 px-3 rounded-md bg-white border border-slate-200 text-slate-700 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 overflow-hidden">
                {userAvatar ? (
                  <img src={normalizeAssetUrl(userAvatar)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={14} />
                )}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none min-w-0">
                <span className="text-[10px] font-medium text-slate-500">Perfil</span>
                <span className="text-[11px] font-semibold text-slate-900 truncate max-w-40">{userName || storeLabel}</span>
              </div>
            </button>
          </div>
        </header>

        <div className="admin-content no-scrollbar flex-1 overflow-y-auto p-3 pb-24 md:p-4 md:pb-24 lg:p-5">
          <div className="mx-auto flex min-h-full w-full max-w-[1680px] flex-col">
            <motion.div
              className="flex-1"
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.12 }}
            >
              {children}
            </motion.div>

            <footer className="hidden">
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

        <nav
          className="admin-mobile-nav fixed inset-x-0 bottom-0 z-50 grid min-h-16 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 text-slate-500 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden"
          style={{ gridTemplateColumns: `repeat(${Math.min(mobilePrimaryItems.length + 1, 5)}, minmax(0, 1fr))` }}
          aria-label="Navegação administrativa móvel"
        >
          {mobilePrimaryItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={`mobile-${item.path}`}
                href={item.path}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold",
                  isActive ? "text-slate-950" : "text-slate-500"
                )}
              >
                <span className={cn(
                  "grid h-7 w-9 place-items-center rounded-md",
                  isActive && "bg-slate-950 text-white"
                )}>
                  <item.icon size={17} />
                </span>
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold text-slate-500"
          >
            <span className="grid h-7 w-9 place-items-center rounded-md">
              <Menu size={18} />
            </span>
            <span>Mais</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
