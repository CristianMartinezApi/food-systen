import { useState, useEffect, useRef } from "react";
import {
    Save,
    Loader2,
    Store,
    Clock,
    CheckCircle2,
    MessageCircle,
    MapPin,
    Globe,
    Share2,
    ImagePlus,
    X,
    Phone,
    Truck,
    DollarSign,
    Map as MapIcon,
    Navigation,
    ShieldCheck,
    Users,
    CreditCard,
    Printer,
    Palette,
    Settings2
} from "lucide-react";
import { useSettings } from "../../../../core/hooks/useSettings";
import { cn, normalizeMoneyInput, parseMoneyInput, toMoneyInputValue, formatMoneyInputRealtime } from "../../../../shared/utils";
import toast from "react-hot-toast";
import { createDefaultOperatingHours, getNextOpeningLabel, isRestaurantOpenNow, normalizeOperatingHours, validateOperatingHours } from "../../../../shared/utils/schedule";
import { sendToWhatsApp } from "../../../../shared/utils/whatsapp";
import { SAAS_SUPPORT_PHONE } from "../../../../core/config/support";
import ChangePassword from "../../components/ChangePassword";
import PixSettings from "../../components/PixSettings";
import PrinterSettings from "../../components/PrinterSettings";
import TeamSettings from "../../components/TeamSettings";
import { compressImageFileToDataUrl } from "../../../../shared/utils/image";
import { uploadImageAsset } from "../../../../core/services/assets";
import { AdminPageHeader } from "../../components/layout/AdminPageHeader";

const DAY_OPTIONS = [
    { key: "seg", label: "Segunda" },
    { key: "ter", label: "Terça" },
    { key: "qua", label: "Quarta" },
    { key: "qui", label: "Quinta" },
    { key: "sex", label: "Sexta" },
    { key: "sab", label: "Sábado" },
    { key: "dom", label: "Domingo" },
] as const;

export default function SettingsPage() {
    const { settings, updateSettings } = useSettings();
    const [formData, setFormData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [savedSnapshot, setSavedSnapshot] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerFileInputRef = useRef<HTMLInputElement>(null);
    const hasInitializedFormRef = useRef(false);
    const openSupportChat = () => {
        sendToWhatsApp(
            SAAS_SUPPORT_PHONE,
            encodeURIComponent(
                "Olá! Estou na tela de configurações do FoodSystem e preciso de ajuda com meu ambiente. Pode me orientar?"
            )
        );
    };

    const createSettingsSnapshot = (data: any) => {
        if (!data) return "";

        return JSON.stringify({
            storeName: data.storeName || "",
            phone: data.phone || "",
            corporateName: data.corporateName || "",
            cnpj: data.cnpj || "",
            logo: data.logo || "",
            primaryColor: data.primaryColor || "",
            bio: data.bio || "",
            bannerImage: data.bannerImage || "",
            bannerBadge: data.bannerBadge || "",
            bannerTitleLine1: data.bannerTitleLine1 || "",
            bannerTitleLine2: data.bannerTitleLine2 || "",
            bannerDescription: data.bannerDescription || "",
            bannerCtaLabel: data.bannerCtaLabel || "",
            address: data.address || "",
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            deliveryRadius: Number(data.deliveryRadius || 0),
            deliveryFee: String(data.deliveryFee ?? ""),
            deliveryEtaMinutes: Number(data.deliveryEtaMinutes || 35),
            minOrderValue: String(data.minOrderValue ?? ""),
            cashDifferenceNoteThreshold: String(data.cashDifferenceNoteThreshold ?? ""),
            tableCount: Number(data.tableCount || 0),
            instagram: data.instagram || "",
            facebook: data.facebook || "",
            operatingHours: normalizeOperatingHours(data.operatingHours || createDefaultOperatingHours()),
        });
    };

    const hasUnsavedChanges = Boolean(formData) && Boolean(savedSnapshot) && createSettingsSnapshot(formData) !== savedSnapshot;

    useEffect(() => {
        if (!settings || hasInitializedFormRef.current) return;

        const initialFormData = {
            ...settings,
            storeName: settings.storeName || "",
            phone: settings.phone || "",
            corporateName: settings.corporateName || "",
            cnpj: settings.cnpj || "",
            primaryColor: settings.primaryColor || "#ef4444",
            bio: settings.bio || "",
            bannerBadge: settings.bannerBadge || "",
            bannerTitleLine1: settings.bannerTitleLine1 || "",
            bannerTitleLine2: settings.bannerTitleLine2 || "",
            bannerDescription: settings.bannerDescription || "",
            bannerCtaLabel: settings.bannerCtaLabel || "",
            address: settings.address || "",
            deliveryRadius: settings.deliveryRadius ?? 5,
            instagram: settings.instagram || "",
            facebook: settings.facebook || "",
            operatingHours: normalizeOperatingHours(settings.operatingHours || createDefaultOperatingHours()),
            deliveryEtaMinutes: settings.deliveryEtaMinutes || 35,
            cashDifferenceNoteThreshold: settings.cashDifferenceNoteThreshold ?? 5,
        };

        setFormData(initialFormData);
        setSavedSnapshot(createSettingsSnapshot(initialFormData));
        hasInitializedFormRef.current = true;
    }, [settings]);

    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const handleDocumentNavigation = (event: MouseEvent) => {
            if (event.defaultPrevented) return;
            if (event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const target = event.target as HTMLElement | null;
            const link = target?.closest("a[href]") as HTMLAnchorElement | null;
            if (!link) return;
            if (link.target === "_blank") return;

            const href = link.getAttribute("href");
            if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

            let destination: URL;
            try {
                destination = new URL(link.href, window.location.href);
            } catch {
                return;
            }

            const currentPath = `${window.location.pathname}${window.location.search}`;
            const destinationPath = `${destination.pathname}${destination.search}`;

            // Ignora links para a mesma rota (ex.: apenas hash).
            if (destinationPath === currentPath) return;

            const shouldLeave = window.confirm("Você tem alterações não salvas. Deseja sair sem salvar?");
            if (!shouldLeave) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            setSavedSnapshot(createSettingsSnapshot(formData));
        };

        document.addEventListener("click", handleDocumentNavigation, true);
        return () => document.removeEventListener("click", handleDocumentNavigation, true);
    }, [hasUnsavedChanges, formData]);

    const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData((prev: any) => ({
            ...prev,
            address: val,
            latitude: val === prev.address ? prev.latitude : null,
            longitude: val === prev.address ? prev.longitude : null,
        }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 11) val = val.slice(0, 11);

        // Mask (11) 99999-9999
        if (val.length > 10) {
            val = val.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        } else if (val.length > 6) {
            val = val.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        } else if (val.length > 2) {
            val = val.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
        } else if (val.length > 0) {
            val = val.replace(/^(\d{2}).*/, "($1");
        }
        setFormData({ ...formData, phone: val });
    };

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 14) val = val.slice(0, 14);

        // Mask XX.XXX.XXX/XXXX-XX
        if (val.length > 12) {
            val = val.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, "$1.$2.$3/$4-$5");
        } else if (val.length > 8) {
            val = val.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, "$1.$2.$3/$4");
        } else if (val.length > 5) {
            val = val.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, "$1.$2.$3");
        } else if (val.length > 2) {
            val = val.replace(/^(\d{2})(\d{0,3}).*/, "$1.$2");
        }
        setFormData({ ...formData, cnpj: val });
    };

    const validateAddressCoordinates = async (address: string, showFeedback = true) => {
        if (!address.trim()) {
            toast.error("Informe o endereço da loja.");
            return false;
        }
        setIsGeocoding(true);
        try {
            const request = fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(address)}`,
                { headers: { "Accept-Language": "pt-BR,pt;q=0.9" } }
            ).then(async (response) => {
                if (!response.ok) throw new Error(`Falha na consulta de localização (${response.status})`);
                return response.json() as Promise<Array<{ lat: string; lon: string }>>;
            });
            const results = await Promise.race([
                request,
                new Promise<never>((_, reject) => window.setTimeout(
                    () => reject(new Error("Tempo limite ao consultar o serviço de localização")),
                    10000
                )),
            ]);
            if (!results[0]) throw new Error("Endereço não localizado");
            const lat = Number(results[0].lat);
            const lng = Number(results[0].lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Coordenadas inválidas");

            setFormData((prev: any) => ({
                ...prev,
                address,
                latitude: lat,
                longitude: lng,
            }));
            if (showFeedback) toast.success("Endereço localizado e coordenadas atualizadas.");
            return true;
        } catch (error) {
            console.error("Erro ao obter coordenadas:", error);
            if (showFeedback) {
                toast.error("Não foi possível localizar esse endereço. Informe rua, número, cidade e estado.");
            }
            return false;
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const optimizedLogo = await compressImageFileToDataUrl(file, {
                    maxWidth: 512,
                    maxHeight: 512,
                    quality: 0.8,
                    mimeType: 'image/webp',
                });

                let logoValue = optimizedLogo;
                try {
                    logoValue = await uploadImageAsset(optimizedLogo, 'logos');
                } catch (uploadError) {
                    console.warn('Falha ao enviar logo para storage, usando base64:', uploadError);
                }

                setFormData((current: any) => ({ ...current, logo: logoValue }));
            } catch (error) {
                console.error("Erro ao processar logo:", error);
                toast.error("Não foi possível processar a logo.");
            }
        }
    };

    const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const optimizedBanner = await compressImageFileToDataUrl(file, {
                    maxWidth: 1400,
                    maxHeight: 900,
                    quality: 0.72,
                    mimeType: 'image/webp',
                });

                let bannerValue = optimizedBanner;
                try {
                    bannerValue = await uploadImageAsset(optimizedBanner, 'banners');
                } catch (uploadError) {
                    console.warn('Falha ao enviar banner para storage, usando base64:', uploadError);
                }

                setFormData((current: any) => ({ ...current, bannerImage: bannerValue }));
            } catch (error) {
                console.error("Erro ao processar banner:", error);
                toast.error("Não foi possível processar a imagem do banner.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.storeName?.trim()) {
            toast.error("Informe o nome da loja antes de salvar.");
            document.querySelector("#settings-brand")?.scrollIntoView({ behavior: "smooth" });
            return;
        }

        if (!hasUnsavedChanges) {
            toast("Não há alterações pendentes para salvar.");
            return;
        }

        const hoursValidation = validateOperatingHours(formData.operatingHours);
        if (!hoursValidation.valid) {
            toast.error(hoursValidation.errors[0]);
            document.querySelector("#settings-hours")?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                deliveryFee: parseMoneyInput(formData.deliveryFee),
                minOrderValue: parseMoneyInput(formData.minOrderValue),
                cashDifferenceNoteThreshold: parseMoneyInput(formData.cashDifferenceNoteThreshold),
            };
            console.log("Enviando dados:", dataToSave);
            await updateSettings(dataToSave);
            setSavedSnapshot(createSettingsSnapshot(formData));
            toast.success("Configurações atualizadas com sucesso!");
        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            const details = Array.isArray(error?.details) ? error.details.join(" ") : "";
            toast.error(details || error?.message || "Erro ao salvar configurações.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!formData) return null;

    const operatingHours = normalizeOperatingHours(formData.operatingHours || createDefaultOperatingHours());
    const isOpenNow = isRestaurantOpenNow(operatingHours);
    const hasValidCoordinates =
        Number.isFinite(Number(formData.latitude)) &&
        Number.isFinite(Number(formData.longitude)) &&
        !(Number(formData.latitude) === 0 && Number(formData.longitude) === 0);
    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);
    const openStreetMapEmbedUrl = hasValidCoordinates
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.006}%2C${longitude + 0.01}%2C${latitude + 0.006}&layer=mapnik&marker=${latitude}%2C${longitude}`
        : "";
    const setupChecks = [
        {
            label: "Identidade",
            href: "#settings-brand",
            complete: Boolean(formData.storeName?.trim() && formData.phone?.trim() && formData.logo),
        },
        {
            label: "Endereço",
            href: "#settings-location",
            complete: Boolean(formData.address?.trim()),
        },
        {
            label: "Operação",
            href: "#settings-delivery",
            complete: parseMoneyInput(formData.minOrderValue) >= 0 && Number(formData.deliveryEtaMinutes || 0) > 0,
        },
        {
            label: "Horários",
            href: "#settings-hours",
            complete: Object.values(operatingHours).some((day) => day.enabled && day.shifts.length > 0),
        },
    ];
    const completedSetupSteps = setupChecks.filter((step) => step.complete).length;
    const setupProgress = Math.round((completedSetupSteps / setupChecks.length) * 100);
    const settingsNavigation = [
        { label: "Marca", href: "#settings-brand", icon: Palette },
        { label: "Local e entrega", href: "#settings-location", icon: MapPin },
        { label: "Operação", href: "#settings-hours", icon: Settings2 },
        { label: "Equipe", href: "#settings-team", icon: Users },
        { label: "Pagamentos", href: "#settings-payments", icon: CreditCard },
        { label: "Impressão", href: "#settings-printer", icon: Printer },
    ];

    const syncOperatingHours = (updater: (hours: ReturnType<typeof normalizeOperatingHours>) => ReturnType<typeof normalizeOperatingHours>) => {
        setFormData((prev: any) => {
            const hours = normalizeOperatingHours(prev?.operatingHours || createDefaultOperatingHours());
            return {
                ...prev,
                operatingHours: updater(hours),
            };
        });
    };

    const updateShift = (day: keyof typeof operatingHours, shiftIndex: number, field: "open" | "close", value: string) => {
        syncOperatingHours((hours) => {
            const nextHours = { ...hours };
            nextHours[day] = {
                ...nextHours[day],
                shifts: nextHours[day].shifts.map((shift, index) => (
                    index === shiftIndex ? { ...shift, [field]: value } : shift
                )),
            };
            return nextHours;
        });
    };

    const addShift = (day: keyof typeof operatingHours) => {
        syncOperatingHours((hours) => {
            const nextHours = { ...hours };
            nextHours[day] = {
                ...nextHours[day],
                shifts: [...nextHours[day].shifts, { open: "12:00", close: "14:00" }],
            };
            return nextHours;
        });
    };

    const removeShift = (day: keyof typeof operatingHours, shiftIndex: number) => {
        syncOperatingHours((hours) => {
            const nextHours = { ...hours };
            nextHours[day] = {
                ...nextHours[day],
                shifts: nextHours[day].shifts.length > 1
                    ? nextHours[day].shifts.filter((_, index) => index !== shiftIndex)
                    : nextHours[day].shifts,
            };
            return nextHours;
        });
    };

    const toggleDay = (day: keyof typeof operatingHours) => {
        syncOperatingHours((hours) => {
            const nextHours = { ...hours };
            nextHours[day] = {
                ...nextHours[day],
                enabled: !nextHours[day].enabled,
            };
            return nextHours;
        });
    };

    return (
        <div className="ops-workspace settings-workspace pb-28 md:pb-32">
            <div className="settings-hero mb-4">
                <AdminPageHeader
                    eyebrow="Administração"
                    title="Configurações da loja"
                    description="Identidade, operação, equipe, pagamentos e integrações."
                    status={
                        <span className={cn(
                            "rounded-md px-2 py-1 text-xs font-medium",
                            hasUnsavedChanges ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        )}>
                            {hasUnsavedChanges ? "Alterações pendentes" : "Tudo salvo"}
                        </span>
                    }
                />
            </div>

                <section className="ops-panel mb-4 overflow-hidden">
                    <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Montagem da loja</p>
                                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                                        {setupProgress === 100 ? "Base operacional configurada" : `${completedSetupSteps} de ${setupChecks.length} etapas essenciais concluídas`}
                                    </h2>
                                </div>
                                <strong className="font-mono text-2xl text-slate-950">{setupProgress}%</strong>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded bg-slate-100">
                                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${setupProgress}%` }} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                                {setupChecks.map((step) => (
                                    <span key={step.label} className={cn(
                                        "inline-flex items-center gap-1.5 text-xs font-medium",
                                        step.complete ? "text-emerald-700" : "text-slate-400"
                                    )}>
                                        <CheckCircle2 size={14} /> {step.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => document.querySelector(setupChecks.find((step) => !step.complete)?.href || "#settings-brand")?.scrollIntoView({ behavior: "smooth" })}
                            className="ops-button border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        >
                            Continuar configuração
                        </button>
                    </div>
                    <nav className="flex gap-1 overflow-x-auto border-t border-slate-200 bg-slate-50 p-2 no-scrollbar" aria-label="Seções das configurações">
                        {settingsNavigation.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="flex h-10 shrink-0 items-center gap-2 rounded border border-transparent px-3 text-xs font-semibold text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
                            >
                                <item.icon size={15} /> {item.label}
                            </a>
                        ))}
                    </nav>
                </section>

                <div className="grid grid-cols-1 gap-4 sm:gap-6 2xl:grid-cols-3">
                    {/* Coluna Principal - Informações */}
                    <div className="space-y-4 sm:space-y-6 2xl:col-span-2">
                        <section id="settings-brand" className="settings-panel settings-panel--brand scroll-mt-20 bg-white rounded-2xl sm:rounded-[3rem] border border-slate-50 p-4 sm:p-6 md:p-10 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                    <Store size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-heading-3 font-display font-bold text-slate-950 tracking-tight">Identidade da loja</h3>
                                    <p className="text-xs text-slate-500 mt-1">Nome, contato e marca exibidos para clientes e equipe.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-10">
                                <div className="space-y-4 md:col-span-2">
                                    <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Logo da loja</label>
                                    <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-10">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="relative w-32 h-32 sm:w-40 sm:h-40 bg-slate-50 rounded-2xl sm:rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-white transition-all group overflow-hidden shadow-sm"
                                        >
                                            {formData.logo ? (
                                                <>
                                                    <img src={formData.logo} alt="Logo preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                        <ImagePlus size={32} />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 shadow-sm mb-4">
                                                        <ImagePlus size={32} />
                                                    </div>
                                                    <span className="text-[10px] font-body font-bold text-slate-400 uppercase tracking-widest">Upload Logo</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-4 text-center md:text-left">
                                            <h4 className="text-body-strong font-body font-bold text-slate-950">Imagem principal da marca</h4>
                                            <p className="max-w-sm text-xs leading-relaxed text-slate-500">Use uma imagem quadrada em PNG, JPG ou WebP. Ela aparecerá na vitrine e no painel.</p>

                                            <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="h-12 px-8 bg-slate-950 text-white rounded-xl text-label font-body font-bold uppercase tracking-widest hover:bg-primary transition-all shadow-lg"
                                                >
                                                    Substituir
                                                </button>

                                                {formData.logo && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, logo: "" })}
                                                        className="h-12 px-8 bg-white border border-slate-100 text-slate-400 rounded-xl text-label font-body font-bold uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all flex items-center gap-2"
                                                    >
                                                        <X size={16} /> Remover
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Nome da loja</label>
                                    <input
                                        value={formData.storeName || ""}
                                        onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                                        className="w-full h-10 sm:h-12 md:h-16 px-4 sm:px-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-[12px] sm:text-label uppercase tracking-widest outline-none"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Telefone de atendimento</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            value={formData.phone || ""}
                                            onChange={handlePhoneChange}
                                            placeholder="(11) 99999-9999"
                                            className="w-full h-10 sm:h-12 md:h-16 pl-12 sm:pl-16 pr-4 sm:pr-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-[12px] sm:text-label uppercase tracking-widest outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Razão Social</label>
                                    <input
                                        value={formData.corporateName || ""}
                                        onChange={(e) => setFormData({ ...formData, corporateName: e.target.value })}
                                        placeholder="Nome jurídico da empresa"
                                        className="w-full h-10 sm:h-12 md:h-16 px-4 sm:px-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-[12px] sm:text-label uppercase tracking-widest outline-none"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">CNPJ</label>
                                    <input
                                        value={formData.cnpj || ""}
                                        onChange={handleCnpjChange}
                                        placeholder="XX.XXX.XXX/XXXX-XX"
                                        className="w-full h-10 sm:h-12 md:h-16 px-4 sm:px-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-[12px] sm:text-label uppercase tracking-widest outline-none"
                                    />
                                </div>

                                <div className="space-y-4 md:col-span-2 mt-4 pt-10 border-t border-slate-50">
                                    <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Cor principal da marca (HEX)</label>
                                    <div className="flex gap-6">
                                        <div className="flex-1 h-16 bg-slate-50 rounded-2xl flex items-center px-6 gap-4">
                                            <div className="w-8 h-8 rounded-xl shadow-lg border-2 border-white" style={{ backgroundColor: formData.primaryColor }} />
                                            <input
                                                value={formData.primaryColor || "#ef4444"}
                                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                                className="bg-transparent font-mono font-medium text-slate-950 uppercase outline-none w-full tracking-widest"
                                            />
                                        </div>
                                        <div className="relative overflow-hidden w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center">
                                            <input
                                                type="color"
                                                value={formData.primaryColor || "#ef4444"}
                                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                                className="absolute inset-0 w-[150%] h-[150%] -translate-x-4 -translate-y-4 cursor-pointer border-none p-0 bg-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Biografia / Descrição da Loja</label>
                                    <textarea
                                        value={formData.bio || ""}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        placeholder="Conte um pouco sobre sua loja, especialidades..."
                                        className="w-full h-32 p-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </section>

                        <section id="settings-banner" className="settings-panel settings-panel--banner scroll-mt-20 bg-white rounded-2xl sm:rounded-[3rem] border border-slate-50 p-4 sm:p-6 md:p-10 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                    <ImagePlus size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">Banner da Loja</h3>
                                    <p className="text-xs text-slate-500 mt-1">Personalize a vitrine principal com imagem, frases e CTA.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-10">
                                <div className="space-y-4 md:col-span-2">
                                    <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Imagem do Banner</label>
                                    <div
                                        onClick={() => bannerFileInputRef.current?.click()}
                                        className="relative min-h-48 sm:min-h-64 rounded-2xl sm:rounded-[2.5rem] overflow-hidden border-2 border-dashed border-slate-100 bg-slate-50 cursor-pointer group shadow-sm"
                                    >
                                        {formData.bannerImage ? (
                                            <>
                                                <img src={formData.bannerImage} alt="Banner preview" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-slate-950/35" />
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 shadow-sm mb-4">
                                                    <ImagePlus size={32} />
                                                </div>
                                                <span className="text-[10px] font-body font-bold text-slate-400 uppercase tracking-widest">Upload do Banner</span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 pointer-events-none">
                                            <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm">
                                                Clique para trocar a imagem
                                            </div>
                                            <div className="bg-slate-950/80 backdrop-blur px-3 py-2 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-sm">
                                                Hero principal
                                            </div>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={bannerFileInputRef}
                                        onChange={handleBannerFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Frase de Destaque</label>
                                    <input
                                        value={formData.bannerBadge || ""}
                                        onChange={(e) => setFormData({ ...formData, bannerBadge: e.target.value })}
                                        className="w-full h-10 sm:h-12 md:h-16 px-4 sm:px-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-[12px] sm:text-label uppercase tracking-widest outline-none"
                                        placeholder="O mais desejado de 2024"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Título Linha 1</label>
                                    <input
                                        value={formData.bannerTitleLine1 || ""}
                                        onChange={(e) => setFormData({ ...formData, bannerTitleLine1: e.target.value })}
                                        className="w-full h-10 sm:h-12 md:h-16 px-4 sm:px-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-[12px] sm:text-label uppercase tracking-widest outline-none"
                                        placeholder="Sabor que"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Título Linha 2</label>
                                    <input
                                        value={formData.bannerTitleLine2 || ""}
                                        onChange={(e) => setFormData({ ...formData, bannerTitleLine2: e.target.value })}
                                        className="w-full h-10 sm:h-12 md:h-16 px-4 sm:px-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-[12px] sm:text-label uppercase tracking-widest outline-none"
                                        placeholder="Transforma"
                                    />
                                </div>

                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Frase de Apoio</label>
                                    <textarea
                                        value={formData.bannerDescription || ""}
                                        onChange={(e) => setFormData({ ...formData, bannerDescription: e.target.value })}
                                        placeholder="Descreva a experiência que o cliente vai sentir no banner..."
                                        className="w-full h-32 p-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none resize-none"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Texto do Botão</label>
                                    <input
                                        value={formData.bannerCtaLabel || ""}
                                        onChange={(e) => setFormData({ ...formData, bannerCtaLabel: e.target.value })}
                                        className="w-full h-10 sm:h-12 md:h-16 px-4 sm:px-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-[12px] sm:text-label uppercase tracking-widest outline-none"
                                        placeholder="Explorar Menu"
                                    />
                                </div>
                            </div>
                        </section>

                        <section id="settings-location" className="settings-panel settings-panel--location scroll-mt-20 bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-10 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Localização</h3>
                                    <p className="text-xs text-slate-500 mt-1">Informe endereço e mapa para cálculo correto de entrega.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                                    <input
                                        value={formData.address || ""}
                                        onChange={handleManualAddressChange}
                                        placeholder="Ex: Rua das Flores, 123 - Centro, São Paulo - SP"
                                        className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                    />

                                    {formData.address && (
                                        <div className={cn(
                                            "mt-3 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between",
                                            hasValidCoordinates
                                                ? "border-emerald-200 bg-emerald-50"
                                                : "border-amber-200 bg-amber-50"
                                        )}>
                                            <div>
                                                <p className={cn(
                                                    "text-xs font-semibold",
                                                    hasValidCoordinates ? "text-emerald-800" : "text-amber-800"
                                                )}>
                                                    {hasValidCoordinates ? "Endereço e coordenadas validados" : "Endereço cadastrado; coordenadas pendentes"}
                                                </p>
                                                <p className="mt-1 text-[11px] text-slate-600">
                                                    {hasValidCoordinates
                                                        ? "O raio de entrega pode ser conferido com precisão."
                                                        : "A loja pode operar, mas valide o mapa para aplicar corretamente o limite de entrega."}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={isGeocoding}
                                                onClick={() => validateAddressCoordinates(String(formData.address || ""))}
                                                className="ops-button shrink-0 border border-slate-300 bg-white text-slate-700 disabled:opacity-60"
                                            >
                                                {isGeocoding ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                                                {hasValidCoordinates ? "Atualizar mapa" : "Validar no mapa"}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Raio de Entrega Máximo (KM)</label>
                                        <div className="relative">
                                            <Navigation className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                            <input
                                                type="number"
                                                value={formData.deliveryRadius ?? 5}
                                                onChange={(e) => setFormData({ ...formData, deliveryRadius: Number(e.target.value) })}
                                                className="w-full h-10 sm:h-12 md:h-14 pl-11 sm:pl-14 pr-4 sm:pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-1">Até quantos KM da sua loja você realiza entregas?</p>
                                    </div>
                                </div>

                                {hasValidCoordinates ? (
                                    <div className="mt-4 overflow-hidden rounded-4xl border-4 border-slate-50 shadow-inner group relative">
                                        <iframe
                                            width="100%"
                                            height="400"
                                            style={{ border: 0 }}
                                            loading="lazy"
                                            allowFullScreen
                                            title="Localização da loja no OpenStreetMap"
                                            src={openStreetMapEmbedUrl}
                                        ></iframe>
                                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                                            <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl border border-slate-100 shadow-sm pointer-events-auto">
                                                <p className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-2">
                                                    <MapIcon size={12} className="text-primary" />
                                                    OpenStreetMap
                                                </p>
                                            </div>

                                            {hasValidCoordinates && (
                                                <div className="bg-emerald-500/90 backdrop-blur px-3 py-2 rounded-xl text-white shadow-sm pointer-events-auto animate-in slide-in-from-top duration-500">
                                                    <p className="text-[10px] font-black uppercase flex items-center gap-2">
                                                        <CheckCircle2 size={12} /> Localização Validada
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Detalhes Técnicos da Coordenada */}
                                        {hasValidCoordinates && (
                                            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-2xl flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex gap-4">
                                                    <p className="text-[10px] font-bold text-white/60">LAT: <span className="text-white">{Number(formData.latitude).toFixed(6)}</span></p>
                                                    <p className="text-[10px] font-bold text-white/60">LNG: <span className="text-white">{Number(formData.longitude).toFixed(6)}</span></p>
                                                </div>
                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">100% Preciso</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-4 h-48 bg-slate-50 rounded-4xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8">
                                        <MapIcon className="text-slate-200 mb-3" size={40} />
                                        <p className="text-xs font-bold text-slate-400 max-w-50">
                                            Digite o endereço para gerar o mapa e capturar as coordenadas exatas.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section id="settings-delivery" className="settings-panel settings-panel--delivery scroll-mt-20 bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-10 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Entrega e Valores</h3>
                                    <p className="text-xs text-slate-500 mt-1">Configure taxas, tempo estimado e regras financeiras da operação.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Taxa de Entrega (R$)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={toMoneyInputValue(formData.deliveryFee)}
                                            onChange={(e) => setFormData({ ...formData, deliveryFee: formatMoneyInputRealtime(e.target.value) })}
                                            className="w-full h-10 sm:h-12 md:h-14 pl-11 sm:pl-14 pr-4 sm:pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tempo Estimado (min)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input
                                            type="number"
                                            min={10}
                                            step="5"
                                            value={formData.deliveryEtaMinutes || 35}
                                            onChange={(e) => setFormData({ ...formData, deliveryEtaMinutes: Number(e.target.value) })}
                                            className="w-full h-10 sm:h-12 md:h-14 pl-11 sm:pl-14 pr-4 sm:pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-1">Mostrado ao cliente no checkout e no fechamento do pedido.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Pedido Mínimo (R$)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={toMoneyInputValue(formData.minOrderValue)}
                                            onChange={(e) => setFormData({ ...formData, minOrderValue: formatMoneyInputRealtime(e.target.value) })}
                                            className="w-full h-10 sm:h-12 md:h-14 pl-11 sm:pl-14 pr-4 sm:pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Divergência sem Justificativa (R$)</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={toMoneyInputValue(formData.cashDifferenceNoteThreshold ?? 5)}
                                            onChange={(e) => setFormData({ ...formData, cashDifferenceNoteThreshold: formatMoneyInputRealtime(e.target.value) })}
                                            className="w-full h-10 sm:h-12 md:h-14 pl-11 sm:pl-14 pr-4 sm:pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-1">No fechamento do caixa, divergências iguais ou acima desse valor exigem justificativa.</p>
                                </div>
                                
                                </div>
                            </section>

                            <section id="settings-hours" className="settings-panel settings-panel--hours scroll-mt-20 bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-10 shadow-sm">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Funcionamento</h3>
                                        <p className="text-xs text-slate-500 mt-1">Defina horários e status automático de abertura da loja.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 gap-6">
                                    <div>
                                        <p className="font-black text-slate-900 uppercase tracking-tight">Status Automático</p>
                                    </div>
                                    <div className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap",
                                        isOpenNow ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                    )}>
                                                                                {isOpenNow
                                                                                    ? "Aberto agora"
                                                                                    : getNextOpeningLabel(operatingHours) === "Sem próximos horários"
                                                                                        ? "Fechado · Sem horário disponível"
                                                                                        : `Fechado · Abre ${getNextOpeningLabel(operatingHours)}`}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Número de Mesas</label>
                                        <div className="relative">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="m5 8 14 0"/><path d="m5 16 14 0"/></svg>
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={formData.tableCount || 0}
                                                onChange={(e) => setFormData({ ...formData, tableCount: Number(e.target.value) })}
                                                className="w-full h-10 sm:h-12 md:h-14 pl-11 sm:pl-14 pr-4 sm:pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-1">Ative o controle de mesas no PDV informando quantas mesas possui.</p>
                                    </div>
                                    {DAY_OPTIONS.map((day) => {
                                        const daySchedule = operatingHours[day.key];

                                        return (
                                            <div key={day.key} className="rounded-2xl border border-slate-50 bg-slate-50/50 p-4 space-y-4">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <span className="text-xs font-black uppercase tracking-widest text-slate-600">{day.label}</span>
                                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.12em] mt-1">
                                                            {daySchedule.enabled ? daySchedule.shifts.map((shift) => `${shift.open} - ${shift.close}`).join(" • ") : "Fechado"}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => toggleDay(day.key)}
                                                        className={cn(
                                                            "px-4 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                            daySchedule.enabled
                                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                                : "bg-rose-500 text-white"
                                                        )}
                                                    >
                                                        {daySchedule.enabled ? "Ativo" : "Fechado"}
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {daySchedule.shifts.map((shift, shiftIndex) => (
                                                        <div key={shiftIndex} className="flex flex-col md:flex-row md:items-center gap-3">
                                                            <input
                                                                type="time"
                                                                value={shift.open || ""}
                                                                onChange={(e) => updateShift(day.key, shiftIndex, "open", e.target.value)}
                                                                className="h-10 px-3 bg-white border border-slate-100 rounded-lg text-xs font-bold outline-none"
                                                            />
                                                            <span className="text-slate-300 font-black">às</span>
                                                            <input
                                                                type="time"
                                                                value={shift.close || ""}
                                                                onChange={(e) => updateShift(day.key, shiftIndex, "close", e.target.value)}
                                                                className="h-10 px-3 bg-white border border-slate-100 rounded-lg text-xs font-bold outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeShift(day.key, shiftIndex)}
                                                                className="h-10 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white text-slate-400 border border-slate-100"
                                                            >
                                                                Remover
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => addShift(day.key)}
                                                    className="h-10 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white text-slate-500 border border-dashed border-slate-200"
                                                >
                                                    Adicionar intervalo
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        <section id="settings-social" className="settings-panel settings-panel--social bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-10 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 sm:mb-8">
                                <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500">
                                    <Globe size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Redes Sociais</h3>
                                    <p className="text-xs text-slate-500 mt-1">Conecte canais oficiais para aumentar confiança e conversão.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Instagram (@usuario)</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input
                                            value={formData.instagram || ""}
                                            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                            placeholder="@seunegocio"
                                            className="w-full h-10 sm:h-12 md:h-14 pl-10 sm:pl-12 pr-4 sm:pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Facebook (URL)</label>
                                    <div className="relative">
                                        <Share2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input
                                            value={formData.facebook || ""}
                                            onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                                            placeholder="facebook.com/..."
                                            className="w-full h-10 sm:h-12 md:h-14 pl-10 sm:pl-12 pr-4 sm:pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div id="settings-team" className="settings-panel scroll-mt-20">
                            <TeamSettings />
                        </div>
                    </div>

                    {/* Coluna Sidebar */}
                    <div className="space-y-4 sm:space-y-8">
                        <div className="settings-panel settings-panel--support bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-sm text-center">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} />
                            </div>
                            <h4 className="font-black text-slate-900 uppercase tracking-tighter mb-2">Ajuda na configuração</h4>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                Precisa de ajuda para preparar a loja? Fale com o suporte e receba orientação sobre esta etapa.
                            </p>
                            <button
                                type="button"
                                onClick={openSupportChat}
                                className="mt-6 w-full h-12 rounded-xl bg-slate-950 text-white text-xs font-black hover:bg-primary transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-950/15"
                            >
                                <MessageCircle size={16} />
                                Falar com Suporte
                            </button>
                            <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                                Abre uma conversa no WhatsApp com a equipe responsável.
                            </p>
                        </div>

                        {/* Componente de Segurança - Mudança de Senha */}
                        <ChangePassword />

                        {/* Configuração PIX */}
                        <div id="settings-payments" className="scroll-mt-20">
                            <PixSettings />
                        </div>
                    </div>
                </div>

                {/* Configuração da Impressora 80mm */}
                <div id="settings-printer" className="mt-4 scroll-mt-20 sm:mt-6 md:mt-10 settings-panel">
                    <PrinterSettings />
                </div>

                <div className="sticky bottom-3 md:bottom-4 z-40 mt-6">
                    <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl px-3 py-3 sm:px-4 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className={cn("text-xs font-semibold", hasUnsavedChanges ? "text-amber-700" : "text-slate-600") }>
                            {hasUnsavedChanges
                                ? "Há alterações não salvas. Clique em salvar para publicar no sistema."
                                : "Sem alterações pendentes. Tudo sincronizado."}
                        </p>
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving || !hasUnsavedChanges}
                            className="h-11 sm:h-12 px-5 sm:px-7 bg-slate-950 text-white rounded-xl font-body font-bold text-[11px] sm:text-xs uppercase tracking-[0.08em] flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                            {isSaving ? "Salvando..." : "Salvar alterações"}
                        </button>
                    </div>
                </div>
            </div>
    );
}
