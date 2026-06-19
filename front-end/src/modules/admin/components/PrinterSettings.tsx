"use client";

import { useEffect, useState } from "react";
import { api } from "../../../core/config/api";
import { CheckCircle2, Loader2, Printer, Radio, Usb, AlertCircle, Copy } from "lucide-react";
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

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/print/settings");
      const data = res as PrintSettingsResponse;
      setStatus(data);
      if (data.device) {
        setForm({
          name: data.device.name || "Impressora de pedidos",
          connectionType: data.device.connectionType,
          ipAddress: data.device.ipAddress || "",
          port: String(data.device.port || 9100),
          usbVendorId: data.device.usbVendorId || "",
          usbProductId: data.device.usbProductId || "",
          paperWidthMm: String(data.device.paperWidthMm || 80),
          isActive: data.device.isActive,
          autoPrintOrders: data.device.autoPrintOrders,
        });
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

    if (form.connectionType === "USB" && (!form.usbVendorId.trim() || !form.usbProductId.trim())) {
      toast.error("Informe Vendor ID e Product ID da impressora USB");
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

  return (
    <section className="w-full bg-white rounded-[2.75rem] border border-slate-100 p-6 sm:p-8 md:p-10 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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
          {status?.device?.isActive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full uppercase tracking-widest">
              <CheckCircle2 size={13} /> Ativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full uppercase tracking-widest">
              <AlertCircle size={13} /> Pendente
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
                <p className="mt-2 font-mono text-xs text-rose-900 break-all leading-relaxed">{status.device.agentToken}</p>
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

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 flex gap-3">
        <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Como funciona:</strong> o agente local na loja usa o token acima para buscar pedidos pendentes e imprimir na térmica 80mm.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome da impressora</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Impressora Balcão"
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, connectionType: "NETWORK" }))}
            className={cn(
              "h-12 rounded-2xl border flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-[11px] transition-all",
              form.connectionType === "NETWORK"
                ? "bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-950/10"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
            )}
          >
            <Radio size={16} /> Rede
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, connectionType: "USB" }))}
            className={cn(
              "h-12 rounded-2xl border flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-[11px] transition-all",
              form.connectionType === "USB"
                ? "bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-950/10"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
            )}
          >
            <Usb size={16} /> USB
          </button>
        </div>

        {form.connectionType === "NETWORK" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">IP da impressora</label>
              <input
                type="text"
                value={form.ipAddress}
                onChange={(e) => setForm((prev) => ({ ...prev, ipAddress: e.target.value }))}
                placeholder="192.168.0.100"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Porta</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm((prev) => ({ ...prev, port: e.target.value }))}
                placeholder="9100"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
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
                onChange={(e) => setForm((prev) => ({ ...prev, usbVendorId: e.target.value }))}
                placeholder="04b8"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Product ID</label>
              <input
                type="text"
                value={form.usbProductId}
                onChange={(e) => setForm((prev) => ({ ...prev, usbProductId: e.target.value }))}
                placeholder="0e15"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Largura do papel</label>
            <select
              value={form.paperWidthMm}
              onChange={(e) => setForm((prev) => ({ ...prev, paperWidthMm: e.target.value }))}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            >
              <option value="80">80 mm</option>
              <option value="58">58 mm</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
            className={cn(
              "h-12 rounded-2xl border font-bold uppercase tracking-widest text-[11px] transition-all",
              form.isActive ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/10" : "bg-slate-50 text-slate-500 border-slate-200"
            )}
          >
            {form.isActive ? "Impressora Ativa" : "Impressora Inativa"}
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, autoPrintOrders: !prev.autoPrintOrders }))}
            className={cn(
              "h-12 rounded-2xl border font-bold uppercase tracking-widest text-[11px] transition-all",
              form.autoPrintOrders ? "bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-950/10" : "bg-slate-50 text-slate-500 border-slate-200"
            )}
          >
            {form.autoPrintOrders ? "Autoimpressão Ligada" : "Autoimpressão Desligada"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 bg-slate-950 text-white rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
            {isSaving ? "Salvando..." : "Salvar Impressora"}
          </button>
          <button
            onClick={handleTest}
            disabled={isTesting || !status?.device}
            className="w-full h-12 bg-rose-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-700 transition-all disabled:opacity-50"
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
