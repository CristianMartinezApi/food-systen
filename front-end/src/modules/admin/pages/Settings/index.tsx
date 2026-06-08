import { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { 
  Save, 
  Loader2,
  Store,
  Clock,
  Palette,
  CheckCircle2,
  MapPin,
  Globe,
  Share2,
  ImagePlus,
  X,
  Phone,
  Truck,
  DollarSign,
  Map as MapIcon,
  Navigation
} from "lucide-react";
import { useSettings } from "../../../../core/hooks/useSettings";
import { cn } from "../../../../shared/utils";
import toast from "react-hot-toast";
import { gsap } from "gsap";
import { createDefaultOperatingHours, getNextOpeningLabel, isRestaurantOpenNow, normalizeOperatingHours } from "../../../../shared/utils/schedule";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

  // Autocomplete Hook
  const {
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here */
    },
    debounce: 300,
    defaultValue: settings?.address || ""
  });

  useEffect(() => {
    if (settings && !formData) {
            setFormData({
                ...settings,
                operatingHours: normalizeOperatingHours(settings.operatingHours || createDefaultOperatingHours()),
                deliveryEtaMinutes: settings.deliveryEtaMinutes || 35,
            });
      setValue(settings.address || "", false);
    }
  }, [settings, setValue, formData]);

    useEffect(() => {
        if (!formData || !rootRef.current) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
            tl.from(".settings-hero", { y: -18, opacity: 0, duration: 0.7 })
                .from(".settings-panel", { y: 24, opacity: 0, duration: 0.8, stagger: 0.08 }, "-=0.25");
        }, rootRef);

        return () => ctx.revert();
    }, [formData]);

  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    setFormData((prev: any) => ({ ...prev, address: val }));
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

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    
    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      
      setFormData((prev: any) => ({ 
        ...prev, 
        address,
        latitude: lat,
        longitude: lng
      }));
    } catch (error) {
      console.error("Erro ao obter coordenadas:", error);
      setFormData((prev: any) => ({ ...prev, address }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log("Enviando dados:", formData);
      await updateSettings(formData);
      toast.success("Configurações atualizadas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!formData) return null;

    const operatingHours = normalizeOperatingHours(formData.operatingHours || createDefaultOperatingHours());
    const isOpenNow = isRestaurantOpenNow(operatingHours);

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
        <div ref={rootRef}>
            <div className="settings-hero flex items-center justify-between mb-12">
        <div>
          <h1 className="text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Arquitetura de Marca</h1>
          <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-2">Defina a identidade visual e os parâmetros operacionais do seu ecossistema.</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSaving}
          className="h-16 px-10 bg-slate-950 text-white rounded-2xl font-body font-bold text-label uppercase tracking-[0.06em] flex items-center gap-3 shadow-2xl shadow-slate-950/20 hover:bg-primary transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          SALVAR DIRETRIZES
        </button>
      </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Coluna Principal - Informações */}
                <div className="lg:col-span-2 space-y-10">
                        <section className="settings-panel bg-white rounded-[3rem] border border-slate-50 p-10 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                        <Store size={22} />
                    </div>
                    <h3 className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">Identidade Corporativa</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4 md:col-span-2">
                        <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Emblema da Marca</label>
                        <div className="flex flex-col md:flex-row items-center gap-10">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="relative w-40 h-40 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-white transition-all group overflow-hidden shadow-sm"
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
                                <h4 className="text-body-strong font-body font-bold text-slate-950 uppercase tracking-tight">Gestão de Mídia Reticular</h4>
                                <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.04em] leading-relaxed max-w-sm">Use arquivos SVG ou PNG de alta fidelidade para garantir a integridade visual da interface.</p>
                                
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
                                            onClick={() => setFormData({...formData, logo: ""})}
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
                        <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Designação da Loja</label>
                        <input 
                            value={formData.storeName}
                            onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                            className="w-full h-16 px-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-label uppercase tracking-widest outline-none"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Terminal de Atendimento</label>
                        <div className="relative">
                            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            <input 
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                placeholder="(11) 99999-9999"
                                className="w-full h-16 pl-16 pr-6 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-950/5 rounded-2xl transition-all font-body font-bold text-slate-950 text-label uppercase tracking-widest outline-none"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-4 md:col-span-2 mt-4 pt-10 border-t border-slate-50">
                        <label className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] ml-1">Cromatismo Signature (HEX)</label>
                        <div className="flex gap-6">
                           <div className="flex-1 h-16 bg-slate-50 rounded-2xl flex items-center px-6 gap-4">
                               <div className="w-8 h-8 rounded-xl shadow-lg border-2 border-white" style={{ backgroundColor: formData.primaryColor }} />
                               <input 
                                   value={formData.primaryColor}
                                   onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                                   className="bg-transparent font-mono font-medium text-slate-950 uppercase outline-none w-full tracking-widest"
                               />
                           </div>
                           <div className="relative overflow-hidden w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center">
                                <input 
                                    type="color"
                                    value={formData.primaryColor}
                                    onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                                    className="absolute inset-0 w-[150%] h-[150%] -translate-x-4 -translate-y-4 cursor-pointer border-none p-0 bg-transparent"
                                />
                           </div>
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Biografia / Descrição da Loja</label>
                        <textarea 
                            value={formData.bio || ""}
                            onChange={(e) => setFormData({...formData, bio: e.target.value})}
                            placeholder="Conte um pouco sobre sua loja, especialidades..."
                            className="w-full h-32 p-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none resize-none"
                        />
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                        <MapPin size={20} />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Localização</h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2 relative">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                        <input 
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                setFormData((prev: any) => ({ ...prev, address: e.target.value }));
                            }}
                            placeholder="Ex: Rua das Flores, 123 - Centro, São Paulo - SP"
                            className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                        />
                        
                        {/* Lista de Sugestões */}
...
                        {status === "OK" && (
                            <div className="absolute z-100 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
                                {data.map(({ place_id, description }) => (
                                    <button
                                        key={place_id}
                                        onClick={() => handleSelect(description)}
                                        className="w-full px-5 py-4 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <MapPin size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">{description.split(',')[0]}</span>
                                            <span className="text-[10px] font-medium text-slate-400">{description.split(',').slice(1).join(',')}</span>
                                        </div>
                                    </button>
                                ))}
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
                                    value={formData.deliveryRadius}
                                    onChange={(e) => setFormData({...formData, deliveryRadius: Number(e.target.value)})}
                                    className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-1">Até quantos KM da sua loja você realiza entregas?</p>
                        </div>
                    </div>

                    {formData.address ? (
                        <div className="mt-4 overflow-hidden rounded-4xl border-4 border-slate-50 shadow-inner group relative">
                            <iframe
                                width="100%"
                                height="400"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(formData.address)}&z=17&output=embed`}
                            ></iframe>
                            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                                <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl border border-slate-100 shadow-sm pointer-events-auto">
                                    <p className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-2">
                                        <MapIcon size={12} className="text-primary" /> 
                                        Busca por Nome
                                    </p>
                                </div>
                                
                                {formData.latitude && (
                                    <div className="bg-emerald-500/90 backdrop-blur px-3 py-2 rounded-xl text-white shadow-sm pointer-events-auto animate-in slide-in-from-top duration-500">
                                        <p className="text-[10px] font-black uppercase flex items-center gap-2">
                                            <CheckCircle2 size={12} /> Localização Validada
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Detalhes Técnicos da Coordenada */}
                            {formData.latitude && (
                                <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-2xl flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-4">
                                        <p className="text-[10px] font-bold text-white/60">LAT: <span className="text-white">{formData.latitude.toFixed(6)}</span></p>
                                        <p className="text-[10px] font-bold text-white/60">LNG: <span className="text-white">{formData.longitude.toFixed(6)}</span></p>
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

            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                        <Truck size={20} />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Entrega e Valores</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Taxa de Entrega (R$)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                                type="number"
                                step="0.01"
                                value={formData.deliveryFee}
                                onChange={(e) => setFormData({...formData, deliveryFee: parseFloat(e.target.value)})}
                                className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
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
                                onChange={(e) => setFormData({...formData, deliveryEtaMinutes: Number(e.target.value)})}
                                className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-1">Mostrado ao cliente no checkout e no fechamento do pedido.</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Pedido Mínimo (R$)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                                type="number"
                                step="0.01"
                                value={formData.minOrderValue}
                                onChange={(e) => setFormData({...formData, minOrderValue: parseFloat(e.target.value)})}
                                className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                        <Clock size={20} />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Funcionamento</h3>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 gap-6">
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight">Status Automático</p>
                            <p className="text-xs font-medium text-slate-500">A loja abre e fecha conforme os horários cadastrados.</p>
                        </div>
                        <div className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap",
                            isOpenNow ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                            {isOpenNow ? "Aberto agora" : `Fechado • ${getNextOpeningLabel(operatingHours)}`}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
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
                                                    value={shift.open}
                                                    onChange={(e) => updateShift(day.key, shiftIndex, "open", e.target.value)}
                                                    className="h-10 px-3 bg-white border border-slate-100 rounded-lg text-xs font-bold outline-none"
                                                />
                                                <span className="text-slate-300 font-black">às</span>
                                                <input
                                                    type="time"
                                                    value={shift.close}
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

            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500">
                        <Globe size={20} />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Redes Sociais</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Instagram (@usuario)</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                                value={formData.instagram || ""}
                                onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                                placeholder="@seunegocio"
                                className="w-full h-14 pl-12 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Facebook (URL)</label>
                        <div className="relative">
                            <Share2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                                value={formData.facebook || ""}
                                onChange={(e) => setFormData({...formData, facebook: e.target.value})}
                                placeholder="facebook.com/..."
                                className="w-full h-14 pl-12 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>

        {/* Coluna Sidebar - Preview e Info */}
        <div className="space-y-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Palette size={120} />
                </div>
                <h3 className="font-black text-xl uppercase tracking-tighter mb-4 relative z-10">Preview em Tempo Real</h3>
                <div className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 relative z-10">
                     <div className="flex items-center gap-3 mb-4">
                        {formData.logo ? (
                            <img src={formData.logo} alt="Logo Preview" className="w-10 h-10 rounded-xl object-cover shadow-lg" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10">
                                <Store size={20} className="text-white/40" />
                            </div>
                        )}
                        <div className="flex-1 truncate">
                            <p className="font-black uppercase text-sm tracking-tight truncate" style={{ color: formData.primaryColor }}>
                                {formData.storeName}
                            </p>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Loja Online</p>
                        </div>
                     </div>
                     <div className="h-2 w-full bg-white/10 rounded-full mb-2" />
                     <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-6 text-center">As cores são aplicadas instantaneamente.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm text-center">
                 <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                 </div>
                 <h4 className="font-black text-slate-900 uppercase tracking-tighter mb-2">Suporte Prioritário</h4>
                 <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Você faz parte do nosso plano Premium. 
                    Precisa de ajuda com as configurações?
                 </p>
                 <button className="mt-6 w-full h-12 rounded-xl border-2 border-slate-50 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest">
                    Falar com Suporte
                 </button>
            </div>
        </div>
      </div>
        </div>
  );
}
