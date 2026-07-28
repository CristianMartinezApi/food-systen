"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  History,
  KeyRound,
  Laptop,
  Loader2,
  Mail,
  MonitorX,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../../core/config/api";
import { uploadImageAsset } from "../../../../core/services/assets";
import { compressImageFileToDataUrl } from "../../../../shared/utils/image";
import { normalizeAssetUrl } from "../../../../shared/utils";
import ChangePassword from "../../components/ChangePassword";

type ProfileData = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerifiedAt: string | null;
  emailNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  restaurant?: {
    id: number;
    name: string;
    slug: string;
    logo?: string | null;
  } | null;
};

type AccessEntry = {
  id: number;
  createdAt: string;
  ipAddress: string;
  userAgent: string;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Administrador do sistema",
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  CASHIER: "Caixa",
  EMPLOYEE: "Colaborador",
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  const localDigits = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  if (localDigits.length <= 10) {
    return localDigits.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_match, ddd, first, last) =>
      [ddd && `(${ddd}`, ddd.length === 2 && ") ", first, last && `-${last}`].filter(Boolean).join("")
    );
  }
  return localDigits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3").replace(/-$/, "");
};

const describeDevice = (userAgent: string) => {
  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Chrome\//.test(userAgent)
      ? "Google Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Navegador";
  const system = /Windows/i.test(userAgent)
    ? "Windows"
    : /Android/i.test(userAgent)
      ? "Android"
      : /iPhone|iPad/i.test(userAgent)
        ? "iOS"
        : /Mac OS/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "dispositivo";
  return `${browser} em ${system}`;
};

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accessHistory, setAccessHistory] = useState<AccessEntry[]>([]);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  const initials = useMemo(() => {
    return (profile?.name || "FS")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile?.name]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [response, historyResponse] = await Promise.all([
        api.get("/users/me/profile"),
        api.get("/users/me/access-history"),
      ]);
      setProfile(response);
      setName(response.name);
      setPhone(formatPhone(response.phone || ""));
      setAvatarUrl(response.avatarUrl || "");
      setNewEmail(response.email);
      setAccessHistory(historyResponse.data || []);
      setEmailNotificationsEnabled(response.emailNotificationsEnabled);
    } catch (error: any) {
      toast.error(error.message || "Não foi possível carregar o perfil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await api.patch("/users/me/profile", {
        name,
        phone,
        avatarUrl,
        emailNotificationsEnabled,
      });
      setProfile(response);
      setPhone(formatPhone(response.phone || ""));
      setAvatarUrl(response.avatarUrl || "");

      const stored = localStorage.getItem("@FoodSystem:user");
      if (stored) {
        const user = JSON.parse(stored);
        user.name = response.name;
        user.phone = response.phone;
        user.avatarUrl = response.avatarUrl;
        user.emailNotificationsEnabled = response.emailNotificationsEnabled;
        localStorage.setItem("@FoodSystem:user", JSON.stringify(user));
      }
      window.dispatchEvent(new Event("foodsystem:user-updated"));
      toast.success(response.message || "Perfil atualizado");
    } catch (error: any) {
      toast.error(error.message || "Não foi possível salvar o perfil");
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const optimized = await compressImageFileToDataUrl(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.78,
        mimeType: "image/webp",
      });
      const uploadedUrl = await uploadImageAsset(optimized, `profiles/user-${profile?.id || "me"}`);
      const response = await api.patch("/users/me/profile", {
        name: profile?.name || name,
        phone: profile?.phone || "",
        avatarUrl: uploadedUrl,
        emailNotificationsEnabled: profile?.emailNotificationsEnabled ?? emailNotificationsEnabled,
      });
      setAvatarUrl(response.avatarUrl || "");
      setProfile(response);

      const stored = localStorage.getItem("@FoodSystem:user");
      if (stored) {
        const user = JSON.parse(stored);
        user.avatarUrl = response.avatarUrl;
        localStorage.setItem("@FoodSystem:user", JSON.stringify(user));
      }
      window.dispatchEvent(new Event("foodsystem:user-updated"));
      toast.success("Foto atualizada com sucesso.");
    } catch (error: any) {
      toast.error(error.message || "Não foi possível processar a foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploadingAvatar(true);
      const response = await api.patch("/users/me/profile", {
        name: profile?.name || name,
        phone: profile?.phone || "",
        avatarUrl: "",
        emailNotificationsEnabled: profile?.emailNotificationsEnabled ?? emailNotificationsEnabled,
      });
      setAvatarUrl("");
      setProfile(response);

      const stored = localStorage.getItem("@FoodSystem:user");
      if (stored) {
        const user = JSON.parse(stored);
        user.avatarUrl = null;
        localStorage.setItem("@FoodSystem:user", JSON.stringify(user));
      }
      window.dispatchEvent(new Event("foodsystem:user-updated"));
      toast.success("Foto removida.");
    } catch (error: any) {
      toast.error(error.message || "Não foi possível remover a foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const revokeOtherSessions = async () => {
    if (!window.confirm("Encerrar todos os outros acessos desta conta? Este dispositivo continuará conectado.")) return;
    try {
      setRevokingSessions(true);
      const response = await api.post("/users/me/revoke-other-sessions", {});
      toast.success(response.message);
    } catch (error: any) {
      toast.error(error.message || "Não foi possível encerrar as outras sessões");
    } finally {
      setRevokingSessions(false);
    }
  };

  const requestVerification = async () => {
    try {
      setSendingVerification(true);
      const response = await api.post("/users/me/email-verification/request", {});
      toast.success(response.message);
      await loadProfile();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível enviar a confirmação");
    } finally {
      setSendingVerification(false);
    }
  };

  const updateEmail = async () => {
    if (!newEmail.trim() || !emailPassword) {
      toast.error("Informe o novo e-mail e sua senha atual");
      return;
    }
    try {
      setSavingEmail(true);
      const response = await api.patch("/users/me/email", {
        email: newEmail,
        currentPassword: emailPassword,
      });
      setProfile((current) => current ? {
        ...current,
        email: response.email,
        emailVerifiedAt: response.emailVerifiedAt,
      } : current);
      setNewEmail(response.email);
      setEmailPassword("");
      setEditingEmail(false);

      const stored = localStorage.getItem("@FoodSystem:user");
      if (stored) {
        const user = JSON.parse(stored);
        user.email = response.email;
        user.emailVerifiedAt = response.emailVerifiedAt;
        localStorage.setItem("@FoodSystem:user", JSON.stringify(user));
      }
      window.dispatchEvent(new Event("foodsystem:user-updated"));
      toast.success(response.message || "E-mail atualizado");
    } catch (error: any) {
      toast.error(error.message || "Não foi possível alterar o e-mail");
    } finally {
      setSavingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!profile) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">Perfil indisponível.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-slate-950 text-xl font-black tracking-widest text-white">
              {avatarUrl ? (
                <img src={normalizeAssetUrl(avatarUrl)} alt={`Foto de ${profile.name}`} className="h-full w-full object-cover" />
              ) : initials}
            </div>
            <label className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border-2 border-white bg-primary text-white shadow-lg">
              {uploadingAvatar ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={changeAvatar} disabled={uploadingAvatar} className="hidden" />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Minha conta</p>
            <h1 className="mt-1 truncate text-2xl font-black text-slate-950 md:text-3xl">{profile.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {ROLE_LABELS[profile.role] || profile.role}
              </span>
              {profile.emailVerifiedAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 size={12} /> E-mail confirmado
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-black">
                {uploadingAvatar ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                {avatarUrl ? "Alterar foto" : "Adicionar foto"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={changeAvatar}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={uploadingAvatar}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  Remover foto
                </button>
              )}
              <p className="w-full text-[11px] text-slate-400">PNG, JPG ou WebP. A imagem será recortada e otimizada automaticamente.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <form onSubmit={saveProfile} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <User size={21} />
            </div>
            <div>
              <h2 className="font-black text-slate-950">Dados pessoais</h2>
              <p className="text-xs text-slate-500">Informações do seu acesso administrativo.</p>
            </div>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Nome completo</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-primary/30 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone pessoal</span>
              <div className="relative">
                <Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={phone}
                  onChange={(event) => setPhone(formatPhone(event.target.value))}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-primary/30 focus:bg-white"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">Uso interno do seu perfil. Não substitui o WhatsApp comercial da loja.</p>
            </label>

            <div>
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail de acesso</span>
              <div className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4">
                <Mail size={17} className="text-slate-400" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{profile.email}</span>
                <button
                  type="button"
                  onClick={() => setEditingEmail((current) => !current)}
                  className="shrink-0 text-[10px] font-black uppercase tracking-wider text-primary"
                >
                  {editingEmail ? "Cancelar" : "Alterar"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">A alteração exige sua senha atual e o novo endereço precisará ser confirmado.</p>
              {editingEmail && (
                <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Novo e-mail</span>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-primary/30"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Senha atual</span>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={emailPassword}
                        onChange={(event) => setEmailPassword(event.target.value)}
                        required
                        autoComplete="current-password"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-primary/30"
                      />
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={updateEmail}
                    disabled={savingEmail}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
                  >
                    {savingEmail && <Loader2 size={14} className="animate-spin" />}
                    Confirmar novo e-mail
                  </button>
                </div>
              )}
            </div>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex gap-3">
                <Bell size={19} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Avisos operacionais por e-mail</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Receber alertas de abertura do caixa e eventos importantes da loja.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailNotificationsEnabled}
                onChange={(event) => setEmailNotificationsEnabled(event.target.checked)}
                className="mt-1 h-5 w-5 accent-primary"
              />
            </label>

            {!profile.emailVerifiedAt && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Confirme seu e-mail para receber os avisos.</p>
                <button
                  type="button"
                  onClick={requestVerification}
                  disabled={sendingVerification}
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl bg-amber-900 px-4 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
                >
                  {sendingVerification && <Loader2 size={14} className="animate-spin" />}
                  Enviar confirmação
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || name.trim().length < 2}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-black disabled:opacity-50"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              Salvar perfil
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-primary" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estabelecimento</p>
                <p className="mt-1 font-bold text-slate-900">{profile.restaurant?.name || "Administração FoodSystem"}</p>
              </div>
            </div>
            {profile.restaurant?.slug && <p className="mt-3 text-xs text-slate-500">Loja: /{profile.restaurant.slug}</p>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold text-slate-900">Conta protegida</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Sua sessão usa cookie seguro e as alterações sensíveis exigem autenticação.</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Membro desde {new Date(profile.createdAt).toLocaleDateString("pt-BR")}
                </p>
                <button
                  type="button"
                  onClick={revokeOtherSessions}
                  disabled={revokingSessions}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                >
                  {revokingSessions ? <Loader2 size={15} className="animate-spin" /> : <MonitorX size={15} />}
                  Encerrar outros acessos
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <History size={21} />
          </div>
          <div>
            <h2 className="font-black text-slate-950">Acessos recentes</h2>
            <p className="text-xs text-slate-500">Últimos logins registrados nesta conta.</p>
          </div>
        </div>
        {accessHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            O histórico começará a aparecer no próximo login.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {accessHistory.map((access, index) => (
              <div key={access.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Laptop size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{describeDevice(access.userAgent)}</p>
                    {index === 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">Mais recente</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(access.createdAt).toLocaleString("pt-BR")} · IP {access.ipAddress}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ChangePassword />
    </div>
  );
}
