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

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setFormData(settings);
      setValue(settings.address || "", false);
    }
  }, [settings, setValue, formData]);

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

  return (
    <>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações da Loja</h1>
          <p className="text-slate-500 font-medium">Personalize a identidade e funcionamento do seu negócio.</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSaving}
          className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          SALVAR ALTERAÇÕES
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal - Informações */}
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Store size={20} />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Identidade Visual</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 md:col-span-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Logo da Loja</label>
                        <div className="flex items-center gap-6">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="relative w-32 h-32 bg-slate-50 rounded-4xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/2 transition-all group overflow-hidden"
                            >
                                {formData.logo ? (
                                    <>
                                        <img src={formData.logo} alt="Logo preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                            <ImagePlus size={24} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ImagePlus className="text-slate-300 group-hover:text-primary transition-colors" size={32} />
                                        <span className="text-[10px] font-black text-slate-400 mt-2 uppercase">Upload</span>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex-1 space-y-4">
                                <p className="text-sm font-bold text-slate-700">Selecione uma imagem local</p>
                                <p className="text-xs text-slate-500 leading-relaxed">Formatos suportados: PNG, JPG ou WEBP. <br/> Resolução recomendada: 512x512px.</p>
                                
                                <div className="flex flex-wrap gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-10 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                                    >
                                        Escolher Arquivo
                                    </button>

                                    {formData.logo && (
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, logo: ""})}
                                            className="h-10 px-4 bg-white border border-rose-100 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center gap-2"
                                        >
                                            <X size={14} /> Remover logo
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

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Loja</label>
                        <input 
                            value={formData.storeName}
                            onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                            className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                        <div className="relative">
                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                placeholder="(11) 99999-9999"
                                className="w-full h-14 pl-14 pr-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cor Primária</label>
                        <div className="flex gap-4">
                           <div className="flex-1 h-14 bg-slate-50 rounded-2xl border-2 border-transparent flex items-center px-5 gap-3">
                               <div className="w-6 h-6 rounded-lg shadow-sm" style={{ backgroundColor: formData.primaryColor }} />
                               <input 
                                   value={formData.primaryColor}
                                   onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                                   className="bg-transparent font-black text-slate-700 uppercase outline-none w-full"
                               />
                           </div>
                           <input 
                               type="color"
                               value={formData.primaryColor}
                               onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                               className="w-14 h-14 rounded-2xl border-none p-0 bg-transparent cursor-pointer"
                           />
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
                            <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
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
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight">Status da Loja</p>
                            <p className="text-xs font-medium text-slate-500">Defina se sua loja está aberta para receber novos pedidos agora.</p>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setFormData({...formData, isOpen: !formData.isOpen})}
                            className={cn(
                                "w-16 h-8 rounded-full transition-all relative flex items-center px-1",
                                formData.isOpen ? "bg-emerald-500" : "bg-slate-300"
                            )}
                        >
                            <div className={cn(
                                "w-6 h-6 bg-white rounded-full shadow-md transition-all",
                                formData.isOpen ? "translate-x-8" : "translate-x-0"
                            )} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((day) => (
                            <div key={day} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-50 bg-slate-50/50">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-600 w-16">{day}</span>
                                
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="time" 
                                        value={formData.operatingHours?.[day]?.open || "18:00"}
                                        onChange={(e) => {
                                            const hours = { ...formData.operatingHours };
                                            hours[day] = { ...hours[day], open: e.target.value };
                                            setFormData({ ...formData, operatingHours: hours });
                                        }}
                                        className="h-10 px-3 bg-white border border-slate-100 rounded-lg text-xs font-bold outline-none"
                                    />
                                    <span className="text-slate-300 font-black">às</span>
                                    <input 
                                        type="time" 
                                        value={formData.operatingHours?.[day]?.close || "23:00"}
                                        onChange={(e) => {
                                            const hours = { ...formData.operatingHours };
                                            hours[day] = { ...hours[day], close: e.target.value };
                                            setFormData({ ...formData, operatingHours: hours });
                                        }}
                                        className="h-10 px-3 bg-white border border-slate-100 rounded-lg text-xs font-bold outline-none"
                                    />
                                </div>

                                <button 
                                    type="button"
                                    onClick={() => {
                                        const hours = { ...formData.operatingHours };
                                        hours[day] = { ...hours[day], closed: !hours[day]?.closed };
                                        setFormData({ ...formData, operatingHours: hours });
                                    }}
                                    className={cn(
                                        "px-4 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        formData.operatingHours?.[day]?.closed 
                                            ? "bg-rose-500 text-white" 
                                            : "bg-white text-slate-400 border border-slate-100"
                                    )}
                                >
                                    {formData.operatingHours?.[day]?.closed ? "Fechado" : "Aberto"}
                                </button>
                            </div>
                        ))}
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
    </>
  );
}
