"use client";

import { useEffect, useState } from "react";
import { api } from "../../../core/config/api";
import { CheckCircle2, Loader2, Printer, Radio, Usb, AlertCircle, Copy, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { cn } from "../../../shared/utils";
import toast from "react-hot-toast";

type ConnectionType = "NETWORK" | "USB";

interface PrintDeviceStatus {
  id: number;
  name: string;
  agentToken: string;
  connectionType: ConnectionType;
  ipAddress: string | null;
  port: number | null;
  usbVendorId: string | null;
  usbProductId: string | null;
  paperWidthMm: number;
  isActive: boolean;
  autoPrintOrders: boolean;
}

interface PrintSettingsResponse {
  device: PrintDeviceStatus | null;
  pendingJobs: number;
  recentJobs: Array<{
    id: number;
    subjectType: string;
    subjectId: number | null;
    template: string;
    printMode: string;
    status: string;
    attempts: number;
    errorMessage: string | null;
    createdAt: string;
    processedAt: string | null;
  }>;
}

export default function PrinterSettings() {
  const [status, setStatus] = useState<PrintSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [form, setForm] = useState({
    name: "Impressora de pedidos",
    connectionType: "NETWORK" as ConnectionType,
    ipAddress: "",
    port: "9100",
    usbVendorId: "",
    usbProductId: "",
    paperWidthMm: "80",
    isActive: true,
    autoPrintOrders: true,
  });
  const [initialForm, setInitialForm] = useState({
    name: "Impressora de pedidos",
    connectionType: "NETWORK" as ConnectionType,
    ipAddress: "",
    port: "9100",
    usbVendorId: "",
    usbProductId: "",
    paperWidthMm: "80",
    isActive: true,
    autoPrintOrders: true,
  });

  const maskToken = (value?: string | null) => {
    const token = String(value || "").trim();
    if (!token) return "";
    if (token.length <= 8) return "*".repeat(token.length);
    return `${token.slice(0, 4)}${"*".repeat(Math.max(8, token.length - 8))}${token.slice(-4)}`;
  };

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/print/settings");
      const data = res as PrintSettingsResponse;
      setStatus(data);
      if (data.device) {
        const nextForm = {
          name: data.device.name || "Impressora de pedidos",
          connectionType: data.device.connectionType,
          ipAddress: data.device.ipAddress || "",
          port: String(data.device.port || 9100),
          usbVendorId: data.device.usbVendorId || "",
          usbProductId: data.device.usbProductId || "",
          paperWidthMm: String(data.device.paperWidthMm || 80),
          isActive: data.device.isActive,
          autoPrintOrders: data.device.autoPrintOrders,
        };
        setForm(nextForm);
        setInitialForm(nextForm);
        setEditUnlocked(false);
      } else {
        const defaultForm = {
          name: "Impressora de pedidos",
          connectionType: "NETWORK" as ConnectionType,
          ipAddress: "",
          port: "9100",
          usbVendorId: "",
          usbProductId: "",
          paperWidthMm: "80",
          isActive: true,
          autoPrintOrders: true,
        };
        setForm(defaultForm);
        setInitialForm(defaultForm);
        // Fluxo de primeira configuração: já entra em modo de cadastro.
        setEditUnlocked(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar impressora");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome da impressora");
      return;
    }

    if (form.connectionType === "NETWORK" && !form.ipAddress.trim()) {
      toast.error("Informe o IP da impressora");
      return;
    }

    if (form.connectionType === "NETWORK") {
      const ip = form.ipAddress.trim();
      const isIpv4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(ip);
      if (!isIpv4) {
        toast.error("Informe um IPv4 válido para a impressora (ex.: 192.168.0.100)");
        return;
      }

      const port = Number(form.port || 9100);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        toast.error("Informe uma porta válida entre 1 e 65535");
        return;
      }
    }

    if (form.connectionType === "USB" && (!form.usbVendorId.trim() || !form.usbProductId.trim())) {
      toast.error("Informe Vendor ID e Product ID da impressora USB");
      return;
    }

    if (!editUnlocked) {
      toast.error("Desbloqueie a edição para salvar alterações da impressora");
      return;
    }

    setIsSaving(true);
    try {
      await api.put("/print/settings", {
        name: form.name.trim(),
        connectionType: form.connectionType,
        ipAddress: form.connectionType === "NETWORK" ? form.ipAddress.trim() : null,
        port: form.connectionType === "NETWORK" ? Number(form.port || 9100) : null,
        usbVendorId: form.connectionType === "USB" ? form.usbVendorId.trim() : null,
        usbProductId: form.connectionType === "USB" ? form.usbProductId.trim() : null,
        paperWidthMm: Number(form.paperWidthMm || 80),
        isActive: form.isActive,
        autoPrintOrders: form.autoPrintOrders,
      });
      setInitialForm({ ...form });
      setEditUnlocked(false);
      toast.success("Impressora salva com sucesso!");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar impressora");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await api.post("/print/settings/test", {});
      toast.success("Teste enviado para a fila de impressão!");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao testar impressão");
    } finally {
      setIsTesting(false);
    }
  };

  const copyToken = async () => {
    if (!status?.device?.agentToken) return;
    if (!showToken) {
      toast.error("Mostre o token antes de copiar");
      return;
    }
    await navigator.clipboard.writeText(status.device.agentToken);
    toast.success("Token do agente copiado!");
  };

  if (isLoading) {
    return (
      <section className="w-full bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm flex items-center justify-center min-h-105">
        <Loader2 className="animate-spin text-slate-300" size={32} />
      </section>
    );
  }

  const isConfigured = Boolean(status?.device);
  const isCreating = !isConfigured;
  const actionButtonClass =
    "h-11 rounded-xl px-4 text-xs font-bold uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2";
  const primaryButtonClass =
    "w-full h-12 bg-slate-950 text-white rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50";
  const secondaryButtonClass =
    "w-full h-12 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50";
  const connectionSummary = form.connectionType === "NETWORK"
    ? `Rede ${form.ipAddress?.trim() || "-"}:${form.port || "9100"}`
    : `USB ${form.usbVendorId?.trim() || "-"}/${form.usbProductId?.trim() || "-"}`;
  const isDirty =
    form.name.trim() !== initialForm.name.trim() ||
    form.connectionType !== initialForm.connectionType ||
    form.ipAddress.trim() !== initialForm.ipAddress.trim() ||
    String(form.port || "") !== String(initialForm.port || "") ||
    form.usbVendorId.trim() !== initialForm.usbVendorId.trim() ||
    form.usbProductId.trim() !== initialForm.usbProductId.trim() ||
    String(form.paperWidthMm) !== String(initialForm.paperWidthMm) ||
    form.isActive !== initialForm.isActive ||
    form.autoPrintOrders !== initialForm.autoPrintOrders;

  return (
    <section className="settings-panel settings-panel--printer w-full bg-white rounded-[2.75rem] border border-slate-100 p-6 sm:p-8 md:p-10 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start mb-8">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
          <Printer size={22} className="text-rose-500" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-slate-950 text-lg uppercase tracking-tight">
            Impressora 80mm
          </h3>
          <p className="text-xs text-slate-400 uppercase tracking-wider mt-1 max-w-104 leading-relaxed">
            Configure a fila térmica da sua loja
          </p>
        </div>
        <div className="sm:ml-auto self-start">
          {!isConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl uppercase tracking-widest">
              <AlertCircle size={13} /> Não cadastrada
            </span>
          ) : status?.device?.isActive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">
              <CheckCircle2 size={13} /> Ativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">
              <AlertCircle size={13} /> Cadastrada (inativa)
            </span>
          )}
        </div>
      </div>

      {isConfigured && status?.device && (
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Configuração atual</p>
            <p className="mt-2 text-sm font-bold text-slate-900 truncate">{status.device.name}</p>
            <p className="mt-1 text-xs text-slate-500 uppercase tracking-[0.12em] leading-relaxed">
              {status.device.connectionType === "NETWORK"
                ? `Rede ${status.device.ipAddress || "-"}:${status.device.port || 9100}`
                : `USB ${status.device.usbVendorId || "-"}/${status.device.usbProductId || "-"}`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Jobs pendentes</p>
              <p className="mt-2 text-2xl font-black text-slate-950 leading-none">{status.pendingJobs}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 text-right">
              {status.device.isActive ? 'Em operação' : 'Inativa'}
            </div>
          </div>

          <div className="sm:col-span-2 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">Token do agente local</p>
                <p className="mt-2 font-mono text-xs text-rose-900 break-all leading-relaxed">{showToken ? status.device.agentToken : maskToken(status.device.agentToken)}</p>
                <button
                  type="button"
                  onClick={() => setShowToken((prev) => !prev)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700"
                >
                  {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showToken ? "Ocultar token" : "Mostrar token"}
                </button>
              </div>
              <button
                type="button"
                onClick={copyToken}
                className="w-10 h-10 shrink-0 rounded-xl bg-white border border-rose-100 text-rose-500 hover:bg-rose-100 transition-all flex items-center justify-center"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
        <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Fluxo recomendado:</strong> salve a configuração, copie o token no agente local e só depois use o teste de impressão.
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-800">Nenhuma impressora cadastrada</p>
          <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
            Preencha os dados abaixo e clique em <strong>Cadastrar impressora</strong>. Depois use o teste para validar a comunicação.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Proteção de edição:</strong> desbloqueie para alterar dados da impressora e evitar mudanças acidentais.
          </p>
          <button
            type="button"
            onClick={() => {
              if (editUnlocked) {
                setForm({ ...initialForm });
                setEditUnlocked(false);
                return;
              }
              setEditUnlocked(true);
            }}
            className={cn(actionButtonClass, editUnlocked ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-slate-900 text-white hover:bg-black")}
          >
            <ShieldCheck size={14} />
            {editUnlocked ? "Bloquear e descartar" : "Desbloquear edição"}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 uppercase tracking-[0.12em]">
          {editUnlocked
            ? "Edição liberada: revise os campos e salve para aplicar."
            : "Edição bloqueada por segurança: clique em desbloquear edição para alterar."}
        </p>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Resumo da conexão</p>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {isConfigured ? `Impressora cadastrada (${connectionSummary})` : "Aguardando cadastro"}
          </p>
        </div>

        {editUnlocked && isDirty && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Você tem alterações não salvas. Clique em <strong>{isCreating ? "Cadastrar impressora" : "Salvar alterações"}</strong> para aplicar.
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Conexão da impressora</p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome da impressora</label>
            <input
              type="text"
              value={form.name}
              disabled={!editUnlocked}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Impressora Balcão"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              disabled={!editUnlocked}
              onClick={() => setForm((prev) => ({ ...prev, connectionType: "NETWORK" }))}
              className={cn(
                "h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-all",
                form.connectionType === "NETWORK" ? "bg-slate-900 text-white" : "text-slate-600",
                !editUnlocked && "opacity-60 cursor-not-allowed"
              )}
            >
              <Radio size={14} /> Rede
            </button>
            <button
              type="button"
              disabled={!editUnlocked}
              onClick={() => setForm((prev) => ({ ...prev, connectionType: "USB" }))}
              className={cn(
                "h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-all",
                form.connectionType === "USB" ? "bg-slate-900 text-white" : "text-slate-600",
                !editUnlocked && "opacity-60 cursor-not-allowed"
              )}
            >
              <Usb size={14} /> USB
            </button>
          </div>

          {form.connectionType === "NETWORK" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">IP da impressora</label>
                <input
                  type="text"
                  value={form.ipAddress}
                  disabled={!editUnlocked}
                  onChange={(e) => setForm((prev) => ({ ...prev, ipAddress: e.target.value }))}
                  placeholder="192.168.0.100"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Porta</label>
                <input
                  type="number"
                  value={form.port}
                  disabled={!editUnlocked}
                  onChange={(e) => setForm((prev) => ({ ...prev, port: e.target.value }))}
                  placeholder="9100"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vendor ID</label>
                <input
                  type="text"
                  value={form.usbVendorId}
                  disabled={!editUnlocked}
                  onChange={(e) => setForm((prev) => ({ ...prev, usbVendorId: e.target.value }))}
                  placeholder="04b8"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Product ID</label>
                <input
                  type="text"
                  value={form.usbProductId}
                  disabled={!editUnlocked}
                  onChange={(e) => setForm((prev) => ({ ...prev, usbProductId: e.target.value }))}
                  placeholder="0e15"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </div>

        {!isConfigured && (
          <p className="text-[11px] text-slate-500 uppercase tracking-[0.12em]">
            Após cadastrar, o token do agente será gerado automaticamente.
          </p>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Operação</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Largura do papel</label>
              <select
                value={form.paperWidthMm}
                disabled={!editUnlocked}
                onChange={(e) => setForm((prev) => ({ ...prev, paperWidthMm: e.target.value }))}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="80">80 mm</option>
                <option value="58">58 mm</option>
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Impressora ativa</p>
                <p className="text-[11px] text-slate-500">Habilita impressões para novos pedidos</p>
              </div>
              <button
                type="button"
                disabled={!editUnlocked}
                onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className={cn(
                  "w-12 h-6 rounded-full transition-all duration-300 relative shrink-0",
                  form.isActive ? "bg-emerald-500" : "bg-slate-300",
                  !editUnlocked && "opacity-60 cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300",
                    form.isActive ? "left-6" : "left-0.5"
                  )}
                />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Autoimpressão</p>
                <p className="text-[11px] text-slate-500">Imprime automaticamente ao criar pedido</p>
              </div>
              <button
                type="button"
                disabled={!editUnlocked}
                onClick={() => setForm((prev) => ({ ...prev, autoPrintOrders: !prev.autoPrintOrders }))}
                className={cn(
                  "w-12 h-6 rounded-full transition-all duration-300 relative shrink-0",
                  form.autoPrintOrders ? "bg-emerald-500" : "bg-slate-300",
                  !editUnlocked && "opacity-60 cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300",
                    form.autoPrintOrders ? "left-6" : "left-0.5"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !editUnlocked || !isDirty}
            className={primaryButtonClass}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
            {isSaving ? "Salvando..." : isCreating ? "Cadastrar impressora" : "Salvar configurações"}
          </button>
          <button
            onClick={handleTest}
            disabled={isTesting || !status?.device || editUnlocked || isDirty}
            className={secondaryButtonClass}
          >
            {isTesting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
            {isTesting ? "Enviando teste..." : "Testar Impressão"}
          </button>
        </div>

        {status?.recentJobs?.length ? (
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Últimos jobs</p>
            <div className="space-y-2">
              {status.recentJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{job.template.replaceAll("_", " ")}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em]">
                      {job.subjectType}#{job.subjectId || "-"} • {job.status}
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                    {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
