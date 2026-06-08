"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "../../../core/stores/useCartStore";
import { useLocationStore } from "../../../core/stores/useLocationStore";
import { useSettings } from "../../../core/hooks/useSettings";
import { useHasHydrated } from "../../../core/hooks/useHasHydrated";
import { Footer } from "../components/layout/Footer";
import { formatCurrency, cn } from "../../../shared/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  Loader2, 
  Phone, 
  Zap, 
  AlertCircle,
  Bike,
  Store,
  UtensilsCrossed,
  Mail,
  User,
  ClipboardCheck,
  Search,
  MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../core/config/api";
import { formatWhatsAppMessage, sendToWhatsApp } from "../../../shared/utils/whatsapp";
import { calculateDistance } from "../../../shared/utils/distance";
import { getTenantSlug } from "../../../shared/utils/tenant";
import { getNextOpeningLabel, isRestaurantOpenNow } from "../../../shared/utils/schedule";
import toast from "react-hot-toast";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Step = "mode" | "customer" | "address" | "payment" | "review" | "success";
type DeliveryMode = "DELIVERY" | "PICKUP" | "DINE_IN";

export default function Checkout() {
  const [step, setStep] = useState<Step>("mode");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [orderCreatedId, setOrderCreatedId] = useState<number | null>(null);
  const [isCepLoading, setIsCepLoading] = useState(false);
  
  const hasHydrated = useHasHydrated();
  const { items, getSubtotal, clearCart } = useCartStore();
  const { address: savedAddress } = useLocationStore();
  const cartItems = hasHydrated ? items : [];
  const { settings } = useSettings();
  const router = useRouter();
  const [slug, setSlug] = useState<string>("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".checkout-header", { y: -18, opacity: 0, duration: 0.7 })
        .from(".checkout-progress", { y: 18, opacity: 0, duration: 0.7 }, "-=0.2")
        .from(".checkout-step-panel", { y: 28, opacity: 0, duration: 0.8, stagger: 0.1 }, "-=0.35")
        .from(".checkout-summary", { x: 20, opacity: 0, duration: 0.8 }, "-=0.45");
    }, rootRef);

    return () => ctx.revert();
  }, [step]);

  // Pre-fill address if available in store
  useEffect(() => {
    if (hasHydrated && savedAddress) {
      setFormData(prev => ({
        ...prev,
        zipCode: savedAddress.zipCode || "",
        street: savedAddress.street || "",
        number: savedAddress.number || "",
        neighborhood: savedAddress.neighborhood || "",
        city: savedAddress.city || "",
        complement: savedAddress.complement || "",
      }));
    }
  }, [hasHydrated, savedAddress]);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("DELIVERY");
  
  const subtotal = hasHydrated ? getSubtotal() : 0;
  const deliveryFee = deliveryMode === "DELIVERY" ? (settings?.deliveryFee || 0) : 0;
  const total = subtotal + deliveryFee;
  const minOrderValue = settings?.minOrderValue || 0;
  const isBelowMinimum = subtotal < minOrderValue;
  const isOpenNow = isRestaurantOpenNow(settings?.operatingHours);
  const estimatedDeliveryMinutes = settings?.deliveryEtaMinutes || 35;

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    email: "",
    zipCode: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    complement: "",
    reference: "",
    paymentMethod: "PIX" as "PIX" | "CARD" | "CASH",
    needsChange: false,
    changeFor: "",
    cpf: ""
  });

  const [isDistanceValidating, setIsDistanceValidating] = useState(false);

  const handleValidateDistance = async () => {
    setIsDistanceValidating(true);
    try {
      // Endereço completo para geocodificação
      const fullAddress = `${formData.street}, ${formData.number}, ${formData.neighborhood}, ${formData.city}`;
      
      // Busca coordenadas do cliente (Usando serviço público gratuito Nominatim se não houver Key)
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
      const data = await resp.json();

      if (data && data.length > 0) {
        const customerLat = parseFloat(data[0].lat);
        const customerLng = parseFloat(data[0].lon);

        const distance = calculateDistance(
          settings.latitude,
          settings.longitude,
          customerLat,
          customerLng
        );

        const radius = settings.deliveryRadius || 5;

        if (distance > radius) {
          toast.error(`Infelizmente seu endereço está fora do nosso raio de entrega (${radius}km). Sua distância: ${distance.toFixed(1)}km`, {
            duration: 5000
          });
          return;
        }

        setStep("payment");
      } else {
        // Se não conseguir geocodificar, permite passar mas avisa o lojista
        console.warn("Não foi possível validar a distância exata.");
        setStep("payment");
      }
    } catch (error) {
       console.error("Erro na validação de distância:", error);
       setStep("payment"); // Permite passar em caso de erro de API externa
    } finally {
      setIsDistanceValidating(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = handlePhoneMask(e.target.value);
    setFormData({ ...formData, phone: val });
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);
    
    // Mask 999.999.999-99
    val = val.replace(/(\d{3})(\d)/, "$1.$2");
    val = val.replace(/(\d{3})(\d)/, "$1.$2");
    val = val.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    
    setFormData({ ...formData, cpf: val });
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    // Mask 99999-999
    val = val.replace(/(\d{5})(\d)/, "$1-$2");
    setFormData({ ...formData, zipCode: val });
  };

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handlePhoneMask = (val: string) => {
    let clean = val.replace(/\D/g, "");
    if (clean.length > 11) clean = clean.slice(0, 11);
    
    if (clean.length > 10) {
      return clean.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (clean.length > 6) {
      return clean.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (clean.length > 2) {
      return clean.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    } else if (clean.length > 0) {
      return clean.replace(/^(\d{2}).*/, "($1");
    }
    return clean;
  };

  const handleCepBlur = async () => {
    const cep = formData.zipCode.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setIsCepLoading(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
        }));
      } else {
        toast.error("CEP não encontrado");
      }
    } catch (error) {
       toast.error("Erro ao buscar CEP");
    } finally {
      setIsCepLoading(false);
    }
  };

  // Tenta carregar dados salvos do cliente (simulando um "cadastro" persistente)
  useEffect(() => {
    const savedCustomer = localStorage.getItem("@FoodSystem:customer");
    if (savedCustomer) {
      try {
        const data = JSON.parse(savedCustomer);
        setFormData(prev => ({
          ...prev,
          customerName: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
        }));
      } catch (e) {}
    }
  }, []);

  const handleNext = () => {
    if (step === "mode") {
       setStep("customer");
       return;
    }

    if (step === "customer") {
       if (!formData.customerName || !formData.phone) {
          toast.error("Preencha seu nome e celular!");
          return;
       }

       if (formData.email && !validateEmail(formData.email)) {
          toast.error("E-mail inválido!");
          return;
       }

       if (formData.phone.replace(/\D/g, '').length < 10) {
          toast.error("Celular inválido!");
          return;
       }

       // Salva para "cadastrar" o cliente localmente
       localStorage.setItem("@FoodSystem:customer", JSON.stringify({
         name: formData.customerName,
         phone: formData.phone,
         email: formData.email
       }));
       localStorage.setItem("@FoodSystem:customerPhone", formData.phone);

       if (deliveryMode === "DELIVERY") setStep("address");
       else if (deliveryMode === "DINE_IN") setStep("review");
       else setStep("payment");
       return;
    }

    if (step === "address") {
       if (!formData.street || !formData.number || !formData.neighborhood) {
          toast.error("Preencha os campos obrigatórios do endereço!");
          return;
       }

       // Validação de Raio de Entrega
       if (deliveryMode === "DELIVERY" && settings?.latitude && settings?.longitude && settings?.deliveryRadius) {
          handleValidateDistance();
          return;
       }

       setStep("payment");
       return;
    }

    if (step === "payment") {
       if (formData.paymentMethod === 'CASH' && formData.needsChange) {
          const changeVal = Number(formData.changeFor.replace(/\D/g, ''));
          if (!changeVal || changeVal <= total) {
             toast.error(`O valor para troco deve ser maior que o total (${formatCurrency(total)})`);
             return;
          }
       }
       setStep("review");
       return;
    }
  };

  const handleBack = () => {
    if (step === "customer") setStep("mode");
    else if (step === "address") setStep("customer");
    else if (step === "payment") {
       if (deliveryMode === "DELIVERY") setStep("address");
       else setStep("customer");
    }
    else if (step === "review") {
       if (deliveryMode === "DINE_IN") setStep("customer");
       else setStep("payment");
    }
    else router.back();
  };

  const handleFinishOrder = async () => {
    if (!isOpenNow) {
        toast.error(`Estamos fechados no momento. ${getNextOpeningLabel(settings?.operatingHours)}`);
        return;
    }

    if (isBelowMinimum && deliveryMode === "DELIVERY") {
        toast.error(`O valor mínimo para entrega é ${formatCurrency(minOrderValue)}`);
        return;
    }
    
    setIsSubmitting(true);
    try {
      const orderData = {
        customerName: formData.customerName,
        phone: formData.phone,
        address: {
          type: deliveryMode,
          details: deliveryMode === "DELIVERY" ? {
            street: formData.street,
            number: formData.number,
            neighborhood: formData.neighborhood,
            city: formData.city,
            zipCode: formData.zipCode,
            complement: formData.complement,
            reference: formData.reference
          } : (deliveryMode === "PICKUP" ? "Retirada no Balcão" : "Consumo no Local")
        },
        paymentMethod: deliveryMode === "DINE_IN" ? "CASH" : formData.paymentMethod,
        changeFor: formData.paymentMethod === 'CASH' && formData.needsChange ? formData.changeFor : null,
        cpf: formData.cpf || null,
        items: items.map((i: any) => ({ 
            productId: i.productId, 
            quantity: i.quantity,
            name: i.name,
            price: i.price,
            variation: i.variation || null,
            addons: i.addons || [],
            removals: i.removals || [],
            observations: i.observations || ""
        })),
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        total: total
      };

      const response = await api.post("/orders", orderData);
      setCreatedOrder(response);
      setOrderCreatedId(response.id);
      setStep("success");
      clearCart();
      toast.success("Pedido enviado com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppNotify = () => {
    if (!createdOrder) return;
    const msg = formatWhatsAppMessage(createdOrder, settings?.storeName || "FoodSystem");
    sendToWhatsApp(settings?.phone || "5511999999999", msg);
  };

  if (items.length === 0 && step !== "success") {
    return (
      <div ref={rootRef} className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-8">
        <div className="relative w-32 h-32 mb-12">
            <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] rotate-6 animate-pulse" />
            <div className="relative w-32 h-32 bg-white rounded-[2.5rem] border border-slate-100 flex items-center justify-center shadow-xl shadow-slate-200/50">
                <ShoppingBag size={48} className="text-slate-200" strokeWidth={1.5} />
            </div>
        </div>
        
        <h2 className="text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight mb-4 text-center">
            Sua Cesta está Vazia
        </h2>
        <p className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mb-12 text-center max-w-xs leading-relaxed">
            Selecione nossas criações exclusivas para iniciar sua experiência.
        </p>
        
        <button 
          onClick={() => router.back()} 
          className="h-16 px-10 bg-slate-950 text-white rounded-2xl font-body font-bold flex items-center justify-center gap-3 shadow-2xl shadow-slate-950/20 hover:bg-black active:scale-[0.98] transition-all uppercase tracking-widest text-label"
        >
            EXPLORAR MENU <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  const stepsList = [
    { key: "mode", label: "Pedido" },
    { key: "customer", label: "Identificação" },
    ...(deliveryMode === "DELIVERY" ? [{ key: "address", label: "Entrega" }] : []),
    ...(deliveryMode !== "DINE_IN" ? [{ key: "payment", label: "Pagamento" }] : []),
    { key: "review", label: "Revisão" }
  ];

  return (
    <div ref={rootRef} className="min-h-screen bg-[#FDFDFD] flex flex-col">
      {/* Header Simplificado de Checkout */}
      {/* Header Simplificado de Checkout Premium */}
      <header className="checkout-header bg-white/80 backdrop-blur-md border-b border-slate-50 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-24 flex items-center justify-between max-w-5xl">
          <button 
            onClick={handleBack}
            className="w-14 h-14 rounded-[1.25rem] bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100 group"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          
          <div className="flex flex-col items-center">
             <h1 className="font-display font-bold text-slate-950 uppercase tracking-tight text-heading-3">
                {step === "success" ? "Confirmação" : "Checkout"}
             </h1>
             <div className="flex items-center gap-2 mt-2">
                <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                <span className="text-label font-body font-medium text-slate-400 uppercase tracking-widest">Experiência Premium</span>
             </div>
          </div>

          <div className="w-14 h-14 rounded-[1.25rem] bg-slate-50 flex items-center justify-center text-primary/30">
             <Zap size={24} fill="currentColor" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 md:py-16 max-w-5xl flex-1">
        {!isOpenNow && (
          <div className="checkout-summary mb-10 rounded-4xl border border-rose-100 bg-rose-50/70 p-5 text-rose-700">
            <p className="text-label font-body font-bold uppercase tracking-[0.08em]">Fechado no momento</p>
            <p className="text-[11px] font-body font-medium uppercase tracking-[0.08em] mt-1">
              {getNextOpeningLabel(settings?.operatingHours)}
            </p>
          </div>
        )}

        {/* PROGRESS BAR LUXURY */}
        {step !== "success" && (
          <div className="checkout-progress flex items-center justify-between relative mb-20 px-4">
                {stepsList.map((s, idx) => {
                    const isCompleted = stepsList.findIndex(stepObj => stepObj.key === step) > idx;
                    const isActive = s.key === step;
                    return (
                        <div key={s.key} className="flex flex-col items-center gap-3 flex-1 relative">
                            <div className={cn(
                                "w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all duration-700 z-10 font-mono font-medium text-numeric text-lg",
                                isActive ? "bg-slate-950 text-white scale-110 shadow-2xl shadow-slate-950/20" : 
                                isCompleted ? "bg-emerald-500 text-white" : "bg-white border border-slate-100 text-slate-300 shadow-sm"
                            )}>
                                {isCompleted ? <CheckCircle2 size={24} /> : (idx + 1).toString().padStart(2, "0")}
                            </div>
                            <span className={cn(
                                "text-label font-body font-bold uppercase tracking-widest text-[10px]",
                                isActive ? "text-slate-950" : "text-slate-300"
                            )}>
                                {s.label}
                            </span>
                            {idx < stepsList.length - 1 && (
                                <div className="absolute top-6 left-1/2 w-full h-px bg-slate-50 z-0">
                                    <div className={cn(
                                        "h-full bg-primary transition-all duration-1000",
                                        isCompleted ? "w-full" : "w-0"
                                    )} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}

        <div className="checkout-main-grid grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Coluna de Conteúdo */}
          <div className="checkout-step-panel lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* PASSO 1: MODO DE ENTREGA */}
              {step === "mode" && (
                <motion.div key="mode" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-4 mb-10">
                     <div className="w-12 h-12 bg-slate-950 text-primary rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10">
                        <ShoppingBag size={24} />
                     </div>
                     <div>
                        <h2 className="text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Experiência</h2>
                        <p className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mt-1">Como deseja desfrutar hoje?</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <SelectOption 
                        active={deliveryMode === 'DELIVERY'} 
                        onClick={() => setDeliveryMode('DELIVERY')}
                        icon={<Bike size={24} />}
                        title="Delivery"
                        description={`Receba com agilidade • ${formatCurrency(settings?.deliveryFee || 0)}`}
                    />
                    <SelectOption 
                        active={deliveryMode === 'PICKUP'} 
                        onClick={() => setDeliveryMode('PICKUP')}
                        icon={<Store size={24} />}
                        title="Retirada"
                        description="Retirada rápida em nossa unidade"
                    />
                    <SelectOption 
                        active={deliveryMode === 'DINE_IN'} 
                        onClick={() => setDeliveryMode('DINE_IN')}
                        icon={<UtensilsCrossed size={24} />}
                        title="No Local"
                        description="Experiência completa em nossa casa"
                    />
                  </div>

                  <button 
                    onClick={handleNext}
                    className="h-20 w-full bg-slate-950 text-white rounded-4xl font-body font-bold flex items-center justify-center gap-4 mt-12 shadow-2xl shadow-slate-950/20 hover:bg-slate-900 transition-all text-label tracking-widest uppercase group"
                  >
                    AVANÇAR PARA IDENTIFICAÇÃO <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}

              {/* PASSO 2: IDENTIFICAÇÃO (CADASTRO) */}
              {step === "customer" && (
                <motion.div key="customer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-4 mb-10">
                     <div className="w-12 h-12 bg-slate-950 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10">
                        <User size={24} />
                     </div>
                     <div>
                        <h2 className="text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Identificação</h2>
                        <p className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mt-1">É um prazer ter você por aqui</p>
                     </div>
                  </div>

                  <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-2xl shadow-slate-200/50 space-y-8">
                    <p className="text-label font-body text-slate-400 uppercase tracking-[0.06em] leading-relaxed">
                        Seus dados são confidenciais e utilizados apenas para a excelência do serviço.
                    </p>
                    
                    <InputGroup 
                        label="Sua Assinatura (Nome Completo)" 
                        icon={<User size={18}/>} 
                        value={formData.customerName} 
                        onChange={(v: string) => setFormData({...formData, customerName: v})} 
                        placeholder="Ex: Alexander von Burger" 
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup 
                            label="WhatsApp Direto" 
                            icon={<Phone size={18}/>} 
                            value={formData.phone} 
                            onChange={(v: string) => handlePhoneChange({ target: { value: v } } as any)} 
                            placeholder="(00) 00000-0000" 
                        />
                        <InputGroup 
                            label="E-mail de Contato" 
                            icon={<Mail size={18}/>} 
                            value={formData.email} 
                            onChange={(v: string) => setFormData({...formData, email: v})} 
                            placeholder="exemplo@premium.com" 
                        />
                    </div>
                    
                    <InputGroup 
                        label="CPF para Nota Fiscal (Opcional)" 
                        icon={<ClipboardCheck size={18}/>} 
                        value={formData.cpf} 
                        onChange={(v: string) => handleCpfChange({ target: { value: v } } as any)} 
                        placeholder="000.000.000-00" 
                    />
                  </div>

                  <button 
                    onClick={handleNext}
                    disabled={isDistanceValidating}
                    className="h-20 w-full bg-slate-950 text-white rounded-4xl font-body font-bold flex items-center justify-center gap-4 mt-12 shadow-2xl shadow-slate-950/20 hover:bg-slate-900 transition-all disabled:opacity-50 text-label tracking-widest uppercase group"
                  >
                    {isDistanceValidating ? (
                      <>Validando Distância... <Loader2 className="animate-spin" /></>
                    ) : (
                      <>
                        {deliveryMode === "DINE_IN" ? "REVISAR PEDIDO" : "CONTINUAR PARA ENTREGA"} <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* PASSO 3: ENDEREÇO (SOMENTE ENTREGA) */}
              {step === "address" && (
                <motion.div key="address" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-4 mb-10">
                     <div className="w-12 h-12 bg-slate-950 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10">
                        <MapPin size={24} />
                     </div>
                     <div>
                        <h2 className="text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Logística</h2>
                        <p className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mt-1">Onde a magia acontece?</p>
                     </div>
                  </div>

                  <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-2xl shadow-slate-200/50 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="md:col-span-1">
                            <div className="space-y-3 group">
                                <label className="text-label font-body font-medium text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-slate-950 transition-colors">
                                    CEP Premium
                                </label>
                                <div className="relative">
                                    <input 
                                        value={formData.zipCode}
                                        onChange={handleCepChange}
                                        onBlur={handleCepBlur}
                                        placeholder="00000-000"
                                        className="w-full h-16 bg-slate-50 border border-transparent rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-slate-950/5 focus:border-slate-950/20 transition-all font-mono text-numeric text-slate-700 outline-none px-6"
                                    />
                                    {isCepLoading && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Loader2 className="animate-spin text-primary" size={20} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <InputGroup label="Logradouro Elegante *" value={formData.street} onChange={(v: string) => setFormData({...formData, street: v})} placeholder="Ex: Avenida Brigadeiro Faria Lima" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        <div className="md:col-span-4">
                            <InputGroup label="Número *" value={formData.number} onChange={(v: string) => setFormData({...formData, number: v})} placeholder="123" />
                        </div>
                        <div className="md:col-span-8">
                            <InputGroup label="Bairro Privilegiado *" value={formData.neighborhood} onChange={(v: string) => setFormData({...formData, neighborhood: v})} placeholder="Nome do bairro" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup label="Metrópole" value={formData.city} onChange={(v: string) => setFormData({...formData, city: v})} placeholder="Sua cidade" />
                        <InputGroup label="Complemento Estilo" value={formData.complement} onChange={(v: string) => setFormData({...formData, complement: v})} placeholder="Apto, Bloco, etc." />
                    </div>

                    <InputGroup label="Ponto de Referência" value={formData.reference} onChange={(v: string) => setFormData({...formData, reference: v})} placeholder="Perto de onde?" />
                  </div>

                  <button 
                    onClick={handleNext}
                    className="h-20 w-full bg-slate-950 text-white rounded-4xl font-body font-bold flex items-center justify-center gap-4 mt-12 shadow-2xl shadow-slate-950/20 hover:bg-slate-900 transition-all text-label tracking-widest uppercase group"
                  >
                    CONTINUAR PARA PAGAMENTO <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}

              {/* PASSO 4: PAGAMENTO */}
              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                   <div className="flex items-center gap-4 mb-10">
                     <div className="w-12 h-12 bg-slate-950 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10">
                        <CreditCard size={24} />
                     </div>
                     <div>
                        <h2 className="text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Financiamento</h2>
                        <p className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mt-1">Como deseja acertar as contas?</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <SelectOption 
                        active={formData.paymentMethod === 'PIX'} 
                        onClick={() => setFormData({...formData, paymentMethod: 'PIX'})}
                        icon={<Zap size={24} className="text-primary fill-primary/20" />}
                        title="Pagar via PIX"
                        description="Crédito instantâneo e 5% de cashback"
                    />
                    <SelectOption 
                        active={formData.paymentMethod === 'CARD'} 
                        onClick={() => setFormData({...formData, paymentMethod: 'CARD'})}
                        icon={<CreditCard size={24} />}
                        title="Cartão na Entrega"
                        description="Maquininha disponível (Crédito/Débito)"
                    />
                    <SelectOption 
                        active={formData.paymentMethod === 'CASH'} 
                        onClick={() => setFormData({...formData, paymentMethod: 'CASH'})}
                        icon={<ShoppingBag size={24} />}
                        title="Dinheiro (Papel Moeda)"
                        description="Pagamento em espécie no momento da entrega"
                    />

                    {formData.paymentMethod === 'CASH' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 mt-2 shadow-inner"
                        >
                          <div className="flex items-center justify-between gap-6">
                            <div>
                                <p className="text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight">Necessita de Troco?</p>
                                <p className="text-label font-body font-medium text-slate-500 uppercase tracking-[0.06em] mt-1">Investimento Total: {formatCurrency(total)}</p>
                            </div>
                            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                                <button 
                                  onClick={() => setFormData({...formData, needsChange: false})}
                                  className={cn(
                                    "px-6 py-3 rounded-xl text-label font-body font-bold transition-all",
                                    !formData.needsChange ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20" : "text-slate-400 hover:text-slate-600"
                                  )}
                                >NÃO</button>
                                <button 
                                  onClick={() => setFormData({...formData, needsChange: true})}
                                  className={cn(
                                    "px-6 py-3 rounded-xl text-label font-body font-bold transition-all",
                                    formData.needsChange ? "bg-primary text-slate-950 shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-600"
                                  )}
                                >SIM</button>
                            </div>
                          </div>

                          {formData.needsChange && (
                            <div className="mt-8 pt-8 border-t border-slate-200">
                              <p className="text-label font-body font-bold text-slate-950 uppercase tracking-widest mb-4">Troco para qual valor?</p>
                              <div className="relative">
                                <span className="absolute left-6 top-[50%] translate-y-[-50%] text-slate-400 font-mono text-lg">R$</span>
                                <input 
                                  type="text"
                                  placeholder="0,00"
                                  value={formData.changeFor}
                                  onChange={(e) => setFormData({...formData, changeFor: e.target.value.replace(/\D/g, '')})}
                                  className={cn(
                                    "w-full h-16 pl-16 pr-6 bg-white rounded-[1.25rem] border border-slate-200 focus:ring-4 focus:ring-slate-950/5 focus:border-slate-950/20 font-mono text-numeric text-xl text-slate-950 outline-none transition-all",
                                    formData.needsChange && Number(formData.changeFor) > 0 && Number(formData.changeFor) <= total && "border-rose-500 ring-4 ring-rose-500/5 text-rose-500"
                                  )}
                                />
                              </div>
                              {formData.changeFor && Number(formData.changeFor) <= total && (
                                <p className="text-label font-body font-medium text-rose-500 mt-3 uppercase tracking-tight flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  O valor deve superar {formatCurrency(total)}
                                </p>
                              )}
                            </div>
                          )}
                        </motion.div>
                    )}
                  </div>

                  <button 
                    onClick={handleNext}
                    className="h-20 w-full bg-slate-950 text-white rounded-4xl font-body font-bold flex items-center justify-center gap-4 mt-12 shadow-2xl shadow-slate-950/20 hover:bg-slate-900 transition-all text-label tracking-widest uppercase group"
                  >
                    REVISAR PEDIDO <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}

              {/* PASSO 5: REVISÃO FINAL */}
              {step === "review" && (
                <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                   <div className="flex items-center gap-4 mb-10">
                     <div className="w-12 h-12 bg-slate-950 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10">
                        <ClipboardCheck size={24} />
                     </div>
                     <div>
                        <h2 className="text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Curadoria</h2>
                        <p className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mt-1">Confirme seu ritual gastronômico</p>
                     </div>
                  </div>

                  <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-2xl shadow-slate-200/50 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div>
                            <h4 className="text-label font-body font-bold text-slate-300 uppercase tracking-[0.15em] mb-4">Comensal</h4>
                            <p className="font-display font-bold text-slate-950 text-heading-3 uppercase tracking-tight leading-tight mb-2">{formData.customerName}</p>
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
                                <Phone size={14} className="text-slate-400" />
                                <p className="text-slate-400 font-mono font-bold text-[11px] tracking-tight">{formData.phone}</p>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-label font-body font-bold text-slate-300 uppercase tracking-[0.15em] mb-4">Experiência & Ativos</h4>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="px-4 py-2 bg-slate-950 text-white rounded-xl text-label font-body font-bold uppercase tracking-widest">
                                        {deliveryMode === 'DELIVERY' ? 'DELIVERY' : (deliveryMode === 'PICKUP' ? 'RETIRADA' : 'NO LOCAL')}
                                    </div>
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <div className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-label font-body font-bold uppercase tracking-widest">
                                        {deliveryMode === 'DINE_IN' ? 'NA MESA' : formData.paymentMethod}
                                    </div>
                                </div>
                                {deliveryMode === 'DINE_IN' && (
                                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] leading-relaxed italic border-l-2 border-primary/20 pl-4">
                                      O acerto será realizado diretamente com nosso concierge na mesa.
                                    </p>
                                )}
                                <div className="mt-4 rounded-3xl bg-slate-50 border border-slate-100 px-4 py-3">
                                  <p className="text-[10px] font-body font-black uppercase tracking-[0.2em] text-slate-400">Tempo estimado</p>
                                  <p className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight mt-1">
                                    {estimatedDeliveryMinutes} min
                                  </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {deliveryMode === 'DELIVERY' && (
                        <div className="pt-8 border-t border-slate-100">
                            <h4 className="text-label font-body font-bold text-slate-300 uppercase tracking-[0.15em] mb-5">Destino da Entrega</h4>
                            <div className="bg-slate-50/50 p-8 rounded-4xl border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-500">
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-slate-300 group-hover:text-slate-950 transition-colors">
                                    <MapPin size={20} />
                                  </div>
                                  <div>
                                    <p className="text-heading-3 font-display font-bold text-slate-950 leading-tight uppercase mb-1">
                                        {formData.street}, {formData.number}
                                    </p>
                                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">
                                        {formData.neighborhood} • {formData.city} {formData.complement && `(${formData.complement})`}
                                    </p>
                                  </div>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>

                  <button 
                    onClick={handleFinishOrder}
                    disabled={isSubmitting || (isBelowMinimum && deliveryMode === 'DELIVERY')}
                    className={cn(
                        "h-24 w-full rounded-[2.5rem] font-body font-bold flex flex-col items-center justify-center gap-1 mt-12 shadow-2xl transition-all duration-300 disabled:opacity-50",
                        isBelowMinimum && deliveryMode === 'DELIVERY'
                            ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                            : "bg-slate-950 text-white shadow-slate-950/20 hover:bg-slate-900 active:scale-[0.98] group"
                    )}
                  >
                    {isSubmitting ? (
                        <Loader2 className="animate-spin text-primary" size={32} />
                    ) : (
                        <>
                            <span className="text-[10px] font-body font-bold text-primary uppercase tracking-[0.3em] mb-1 group-hover:tracking-[0.4em] transition-all">Lançar Ordem de Produção</span>
                            <div className="flex items-center gap-4">
                              <span className="text-heading-2 font-display font-bold uppercase tracking-tight">CONFIRMAR INVESTIMENTO</span>
                              <div className="w-px h-6 bg-white/20" />
                              <span className="text-heading-2 font-mono font-bold text-primary">{formatCurrency(total)}</span>
                            </div>
                        </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* PASSO FINAL: SUCESSO - EXPERIÊNCIA PREMIUM */}
              {step === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-20 text-center max-w-xl mx-auto">
                    <div className="relative w-40 h-40 mx-auto mb-14">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }} 
                            animate={{ scale: 1.4, opacity: 0 }} 
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
                            className="absolute inset-0 rounded-[3.5rem] border-2 border-emerald-500/30" 
                        />
                        <div className="relative w-full h-full bg-emerald-50 text-emerald-500 rounded-[3.5rem] flex items-center justify-center shadow-[0_32px_64px_rgba(16,185,129,0.15)] border border-emerald-100/50">
                            <CheckCircle2 size={72} strokeWidth={1.5} className="drop-shadow-sm" />
                        </div>
                    </div>
                    
                    <h2 className="text-display font-display font-bold text-slate-950 uppercase tracking-tighter mb-6 leading-none">
                        Pedido <br/> Confirmado
                    </h2>
                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mb-16 leading-relaxed max-w-xs mx-auto">
                        Seu ticket <span className="text-slate-950 font-mono font-bold">#{orderCreatedId}</span> está em nossa linha de produção.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-6">
                        <button 
                            onClick={handleWhatsAppNotify}
                            className="h-24 flex flex-col items-center justify-center bg-emerald-500 text-white rounded-[2.5rem] font-body font-medium shadow-[0_20px_40px_rgba(16,185,129,0.3)] hover:bg-emerald-600 active:scale-[0.98] transition-all group"
                        >
                            <span className="text-label font-body font-bold uppercase tracking-[0.2em] opacity-80 mb-2 text-[10px]">Acompanhamento em Tempo Real</span>
                            <div className="flex items-center gap-4">
                                <MessageCircle size={24} strokeWidth={2} />
                                <span className="text-body-strong font-body font-bold uppercase tracking-widest text-lg">Notificar via WhatsApp</span>
                            </div>
                        </button>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <Link href={`/${slug}/orders`} className="h-16 flex items-center justify-center bg-slate-950 text-white rounded-2xl font-body font-bold shadow-2xl shadow-slate-950/20 hover:bg-black transition-all uppercase tracking-widest text-label">
                                MEUS PEDIDOS
                            </Link>
                            <Link href={`/${slug}`} className="h-16 flex items-center justify-center bg-white border border-slate-100 text-slate-400 rounded-2xl font-body font-bold hover:bg-slate-50 transition-all uppercase tracking-widest text-label">
                                NOVA ORDEM
                            </Link>
                        </div>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Resumo do Pedido - Curadoria Sticky lateral */}
          {step !== "success" && (
            <div className="lg:col-span-1">
                <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-[0_20px_50px_rgba(0,0,0,0.02)] sticky top-32">
                    <h3 className="font-display font-bold text-heading-3 text-slate-950 uppercase tracking-tight mb-8 flex items-center justify-between">
                        Sua Cesta <span className="text-label font-body font-bold bg-slate-50 px-3 py-1.5 rounded-xl text-slate-400 uppercase tracking-widest text-[10px]">{items.length} ITENS</span>
                    </h3>
                    
                    <div className="space-y-6 mb-10 max-h-64 overflow-y-auto no-scrollbar pr-2">
                        {items.map((item: any, idx) => (
                            <div key={idx} className="flex justify-between items-start group">
                                <div className="flex-1 pr-6">
                                    <p className="text-label font-body font-bold text-slate-900 uppercase tracking-tight truncate leading-none mb-1">{item.name}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <p className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-tighter">{item.quantity}x {formatCurrency(item.price)}</p>
                                        {item.addons?.map((a: any, i: number) => (
                                            <span key={i} className="text-[10px] font-body font-medium text-primary uppercase tracking-wider">
                                                • {a.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <p className="font-mono font-bold text-slate-950 text-label tracking-tighter">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 pt-8 border-t border-slate-50">
                        <div className="flex justify-between items-center">
                            <span className="font-body font-medium text-slate-400 uppercase text-label tracking-widest">Subtotal</span>
                            <span className="font-mono font-medium text-slate-950 tracking-tighter">{formatCurrency(subtotal)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="font-body font-medium text-slate-400 uppercase text-label tracking-widest">Logística</span>
                            <span className={cn("font-mono font-bold tracking-tighter", deliveryFee > 0 ? "text-slate-950" : "text-emerald-500")}>
                                {deliveryFee > 0 ? formatCurrency(deliveryFee) : "CORTESIA"}
                            </span>
                        </div>

                        <div className="h-px bg-slate-50 my-4" />
                        
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-label font-body font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 text-[10px]">Total Investido</p>
                                <p className="text-4xl font-mono font-bold text-primary tracking-tighter leading-none">{formatCurrency(total)}</p>
                            </div>
                        </div>
                    </div>

                    {isBelowMinimum && deliveryMode === 'DELIVERY' && (
                        <div className="mt-8 p-6 bg-slate-950 rounded-4xl border border-slate-900 flex items-start gap-4">
                            <AlertCircle size={20} className="text-primary shrink-0 mt-0.5" />
                            <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.08em] leading-relaxed text-[10px]">
                                <span className="text-white font-bold">Mínimo para Entrega:</span> {formatCurrency(minOrderValue)}. <br/> 
                                Adicione mais {formatCurrency(minOrderValue - subtotal)} em produtos.
                            </p>
                        </div>
                    )}
                </div>
            </div>
          )}

        </div>
      </main>

      {step === "success" && <Footer />}
    </div>
  );
}

function SelectOption({ active, onClick, title, description, icon }: any) {
  return (
    <button 
        onClick={onClick}
        className={cn(
            "p-8 rounded-4xl border-2 text-left transition-all duration-500 flex items-center gap-6 group relative overflow-hidden",
            active 
                ? "bg-slate-950 border-slate-950 shadow-2xl shadow-slate-950/20 ring-4 ring-slate-950/5" 
                : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-100"
        )}
    >
        {active && (
          <motion.div 
            layoutId="option-bg"
            className="absolute inset-0 bg-linear-to-br from-slate-900 to-slate-950 z-0"
          />
        )}
        
        <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 z-10",
            active ? "bg-primary text-slate-950 scale-110 shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600"
        )}>
            {icon}
        </div>
        <div className="flex-1 z-10">
            <h4 className={cn(
                "font-display font-bold text-heading-3 uppercase tracking-tight transition-colors mb-1",
                active ? "text-white" : "text-slate-950"
            )}>
                {title}
            </h4>
            <p className={cn(
                "text-label font-body font-medium uppercase tracking-wider transition-colors",
                active ? "text-slate-400" : "text-slate-400 group-hover:text-slate-500"
            )}>
                {description}
            </p>
        </div>
        {active && (
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center z-10 shadow-lg">
                <CheckCircle2 size={20} className="text-slate-950" />
            </div>
        )}
    </button>
  );
}

function InputGroup({ label, icon, value, onChange, placeholder }: any) {
    return (
        <div className="space-y-3 group">
            <label className="text-label font-body font-bold text-slate-300 uppercase tracking-[0.2em] ml-1 group-focus-within:text-slate-950 transition-all duration-300 block text-[10px]">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-950 transition-all duration-300">
                        {icon}
                    </div>
                )}
                <input 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                        "w-full h-16 bg-slate-50 border border-transparent rounded-[1.25rem] focus:bg-white focus:ring-8 focus:ring-slate-950/5 focus:border-slate-950/10 transition-all duration-300 font-body font-bold text-body-lg text-slate-950 outline-none placeholder:text-slate-300 placeholder:font-medium",
                        icon ? "pl-16" : "px-8"
                    )}
                />
            </div>
        </div>
    );
}
