"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "../../../core/stores/useCartStore";
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
import toast from "react-hot-toast";

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
  const cartItems = hasHydrated ? items : [];
  const { settings } = useSettings();
  const router = useRouter();
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("DELIVERY");
  
  const subtotal = hasHydrated ? getSubtotal() : 0;
  const deliveryFee = deliveryMode === "DELIVERY" ? (settings?.deliveryFee || 0) : 0;
  const total = subtotal + deliveryFee;
  const minOrderValue = settings?.minOrderValue || 0;
  const isBelowMinimum = subtotal < minOrderValue;

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
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag size={48} className="text-slate-200" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Carrinho Vazio</h2>
        <p className="text-slate-500 font-medium mb-8 text-center max-w-xs">
          Parece que você ainda não escolheu seus pratos favoritos.
        </p>
        <button onClick={() => router.back()} className="h-14 px-8 bg-primary text-white rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-primary/30 active:scale-95 transition-transform">
          VOLTAR AO CARDÁPIO
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
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col">
      {/* Header Simplificado de Checkout */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-50 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between max-w-5xl">
          <button 
            onClick={handleBack}
            className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex flex-col items-center">
             <h1 className="font-black text-slate-900 uppercase tracking-tighter text-lg">
                {step === "success" ? "Sucesso" : "Finalizar Pedido"}
             </h1>
          </div>

          <div className="w-12 h-12 flex items-center justify-center text-slate-200">
             <Zap size={24} fill="currentColor" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-5xl flex-1">
        {/* PROGRESS BAR */}
        {step !== "success" && (
            <div className="flex items-center justify-between relative mb-12">
                {stepsList.map((s, idx) => {
                    const isCompleted = stepsList.findIndex(stepObj => stepObj.key === step) > idx;
                    const isActive = s.key === step;
                    return (
                        <div key={s.key} className="flex flex-col items-center gap-2 flex-1 relative">
                            <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 font-black text-sm",
                                isActive ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" : 
                                isCompleted ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                            )}>
                                {isCompleted ? <CheckCircle2 size={18} /> : idx + 1}
                            </div>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest hidden sm:block mt-1",
                                isActive ? "text-primary" : isCompleted ? "text-emerald-500" : "text-slate-400"
                            )}>{s.label}</span>
                            
                            {/* Linha conectora */}
                            {idx < stepsList.length - 1 && (
                                <div className="absolute left-[50%] w-full h-[3px] top-[18px] -z-0 bg-slate-100">
                                    <motion.div 
                                        initial={false}
                                        animate={{ width: isCompleted ? "100%" : "0%" }}
                                        className="h-full bg-emerald-500 transition-all duration-500" 
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Coluna de Conteúdo */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* PASSO 1: MODO DE ENTREGA */}
              {step === "mode" && (
                <motion.div key="mode" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <ShoppingBag size={20} />
                     </div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Como prefere receber?</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <SelectOption 
                        active={deliveryMode === 'DELIVERY'} 
                        onClick={() => setDeliveryMode('DELIVERY')}
                        icon={<Bike size={24} />}
                        title="Entrega"
                        description={`Levamos até você em minutos • ${formatCurrency(settings?.deliveryFee || 0)}`}
                    />
                    <SelectOption 
                        active={deliveryMode === 'PICKUP'} 
                        onClick={() => setDeliveryMode('PICKUP')}
                        icon={<Store size={24} />}
                        title="Retirada no Balcão"
                        description="Você busca no restaurante • Grátis"
                    />
                    <SelectOption 
                        active={deliveryMode === 'DINE_IN'} 
                        onClick={() => setDeliveryMode('DINE_IN')}
                        icon={<UtensilsCrossed size={24} />}
                        title="Comer no Local"
                        description="Reserve sua mesa agora • Grátis"
                    />
                  </div>

                  <button 
                    onClick={handleNext}
                    className="h-16 w-full bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 mt-8 shadow-xl shadow-slate-900/10 hover:bg-black transition-all"
                  >
                    CONTINUAR <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}

              {/* PASSO 2: IDENTIFICAÇÃO (CADASTRO) */}
              {step === "customer" && (
                <motion.div key="customer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <User size={20} />
                     </div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Quem é você?</h2>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Preencha seus dados para finalizarmos seu pedido e mantermos você atualizado.
                    </p>
                    
                    <InputGroup 
                        label="Seu Nome Completo" 
                        icon={<User size={18}/>} 
                        value={formData.customerName} 
                        onChange={(v: string) => setFormData({...formData, customerName: v})} 
                        placeholder="Ex: João Silva" 
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup 
                            label="WhatsApp" 
                            icon={<Phone size={18}/>} 
                            value={formData.phone} 
                            onChange={(v: string) => handlePhoneChange({ target: { value: v } } as any)} 
                            placeholder="(00) 00000-0000" 
                        />
                        <InputGroup 
                            label="E-mail" 
                            icon={<Mail size={18}/>} 
                            value={formData.email} 
                            onChange={(v: string) => setFormData({...formData, email: v})} 
                            placeholder="joao@exemplo.com" 
                        />
                    </div>
                    
                    <InputGroup 
                        label="CPF para Nota (Opcional)" 
                        icon={<ClipboardCheck size={18}/>} 
                        value={formData.cpf} 
                        onChange={(v: string) => handleCpfChange({ target: { value: v } } as any)} 
                        placeholder="000.000.000-00" 
                    />
                  </div>

                  <button 
                    onClick={handleNext}
                    disabled={isDistanceValidating}
                    className="h-16 w-full bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 mt-8 shadow-xl shadow-slate-900/10 hover:bg-black transition-all disabled:opacity-50"
                  >
                    {isDistanceValidating ? (
                      <>Validando Distância... <Loader2 className="animate-spin" /></>
                    ) : (
                      <>
                        {deliveryMode === "DINE_IN" ? "REVISAR PEDIDO" : "CONTINUAR"} <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* PASSO 3: ENDEREÇO (SOMENTE ENTREGA) */}
              {step === "address" && (
                <motion.div key="address" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <MapPin size={20} />
                     </div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Onde entregamos?</h2>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1">
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                                    CEP
                                </label>
                                <div className="relative">
                                    <input 
                                        value={formData.zipCode}
                                        onChange={handleCepChange}
                                        onBlur={handleCepBlur}
                                        placeholder="00000-000"
                                        className="w-full h-16 bg-slate-50 border border-transparent rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-bold text-slate-700 outline-none px-6"
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
                            <InputGroup label="Rua / Avenida *" value={formData.street} onChange={(v: string) => setFormData({...formData, street: v})} placeholder="Ex: Av. Paulista" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-4">
                            <InputGroup label="Número *" value={formData.number} onChange={(v: string) => setFormData({...formData, number: v})} placeholder="123" />
                        </div>
                        <div className="md:col-span-8">
                            <InputGroup label="Bairro *" value={formData.neighborhood} onChange={(v: string) => setFormData({...formData, neighborhood: v})} placeholder="Nome do bairro" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup label="Cidade" value={formData.city} onChange={(v: string) => setFormData({...formData, city: v})} placeholder="Sua cidade" />
                        <InputGroup label="Complemento" value={formData.complement} onChange={(v: string) => setFormData({...formData, complement: v})} placeholder="Apto, Bloco, etc." />
                    </div>

                    <InputGroup label="Referência" value={formData.reference} onChange={(v: string) => setFormData({...formData, reference: v})} placeholder="Perto de onde?" />
                  </div>

                  <button 
                    onClick={handleNext}
                    className="h-16 w-full bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 mt-8 shadow-xl shadow-slate-900/10 hover:bg-black transition-all"
                  >
                    CONTINUAR PARA PAGAMENTO <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}

              {/* PASSO 4: PAGAMENTO */}
              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                   <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <CreditCard size={20} />
                     </div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Como prefere pagar?</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <SelectOption 
                        active={formData.paymentMethod === 'PIX'} 
                        onClick={() => setFormData({...formData, paymentMethod: 'PIX'})}
                        icon={<Zap size={24} className="text-primary fill-primary/20" />}
                        title="Pagar com PIX"
                        description="Aprovação instantânea e segura"
                    />
                    <SelectOption 
                        active={formData.paymentMethod === 'CARD'} 
                        onClick={() => setFormData({...formData, paymentMethod: 'CARD'})}
                        icon={<CreditCard size={24} />}
                        title="Cartão na Entrega"
                        description="Maquininha (Crédito ou Débito)"
                    />
                    <SelectOption 
                        active={formData.paymentMethod === 'CASH'} 
                        onClick={() => setFormData({...formData, paymentMethod: 'CASH'})}
                        icon={<ShoppingBag size={24} />}
                        title="Dinheiro"
                        description="Pague ao receber o pedido"
                    />

                    {formData.paymentMethod === 'CASH' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 mt-2"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Precisa de troco?</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total: {formatCurrency(total)}</p>
                            </div>
                            <div className="flex bg-white p-1 rounded-xl border border-slate-100">
                                <button 
                                  onClick={() => setFormData({...formData, needsChange: false})}
                                  className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-black transition-all",
                                    !formData.needsChange ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
                                  )}
                                >NÃO</button>
                                <button 
                                  onClick={() => setFormData({...formData, needsChange: true})}
                                  className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-black transition-all",
                                    formData.needsChange ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600"
                                  )}
                                >SIM</button>
                            </div>
                          </div>

                          {formData.needsChange && (
                            <div className="mt-4 pt-4 border-t border-primary/10">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Troco para quanto?</p>
                              <div className="relative">
                                <span className="absolute left-4 top-[50%] -translate-y-[50%] text-slate-400 font-bold">R$</span>
                                <input 
                                  type="text"
                                  placeholder="0,00"
                                  value={formData.changeFor}
                                  onChange={(e) => setFormData({...formData, changeFor: e.target.value.replace(/\D/g, '')})}
                                  className={cn(
                                    "w-full h-12 pl-12 pr-4 bg-white rounded-xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-900",
                                    formData.needsChange && Number(formData.changeFor) > 0 && Number(formData.changeFor) <= total && "ring-2 ring-rose-500/50"
                                  )}
                                />
                              </div>
                              {formData.changeFor && Number(formData.changeFor) <= total && (
                                <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-tight">O valor deve ser maior que {formatCurrency(total)}</p>
                              )}
                            </div>
                          )}
                        </motion.div>
                    )}
                  </div>

                  <button 
                    onClick={handleNext}
                    className="h-16 w-full bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 mt-8 shadow-xl shadow-slate-900/10 hover:bg-black transition-all"
                  >
                    REVISAR PEDIDO <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}

              {/* PASSO 5: REVISÃO FINAL */}
              {step === "review" && (
                <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                   <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <ClipboardCheck size={20} />
                     </div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Revise seu Pedido</h2>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Seus Dados</h4>
                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{formData.customerName}</p>
                            <p className="text-slate-500 font-bold text-sm tracking-tight">{formData.phone}</p>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Modo / Pagamento</h4>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="font-black text-slate-800 text-sm uppercase">
                                    {deliveryMode === 'DELIVERY' ? 'Entrega' : (deliveryMode === 'PICKUP' ? 'Retirada' : 'No Local')}
                                </p>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <p className="font-black text-primary text-sm uppercase">
                                    {deliveryMode === 'DINE_IN' ? 'A Combinar' : formData.paymentMethod}
                                </p>
                            </div>
                        </div>
                    </div>

                    {deliveryMode === 'DELIVERY' && (
                        <div className="pt-6 border-t border-slate-50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Endereço de Entrega</h4>
                            <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-sm font-black text-slate-800 leading-relaxed uppercase">
                                    {formData.street}, {formData.number}
                                </p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    {formData.neighborhood} - {formData.city} {formData.complement && `(${formData.complement})`}
                                </p>
                            </div>
                        </div>
                    )}
                  </div>

                  <button 
                    onClick={handleFinishOrder}
                    disabled={isSubmitting || (isBelowMinimum && deliveryMode === 'DELIVERY')}
                    className={cn(
                        "h-20 w-full rounded-[2rem] font-black flex flex-col items-center justify-center gap-0 mt-10 shadow-2xl transition-all disabled:opacity-50",
                        isBelowMinimum && deliveryMode === 'DELIVERY'
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                            : "bg-primary text-white shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    {isSubmitting ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <>
                            <span className="text-xs opacity-80 uppercase tracking-widest font-black mb-1">Confirmar e Enviar</span>
                            <span className="text-xl">FINALIZAR POR {formatCurrency(total)}</span>
                        </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* PASSO FINAL: SUCESSO */}
              {step === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-100 relative">
                        <CheckCircle2 size={48} />
                        <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute inset-0 rounded-[2rem] border-2 border-emerald-500" 
                        />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Pedido Recebido!</h2>
                    <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto mb-10 leading-relaxed">
                        Seu pedido <span className="text-slate-900 font-black">#{orderCreatedId}</span> já foi enviado para o restaurante. 
                        Preparamos tudo com carinho!
                    </p>
                    <div className="flex flex-col gap-4 max-w-xs mx-auto">
                        <button 
                            onClick={handleWhatsAppNotify}
                            className="h-16 flex items-center justify-center bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs gap-3"
                        >
                            <MessageCircle size={20} /> NOTIFICAR WHATSAPP
                        </button>
                        <Link href={`/${slug}/orders`} className="h-16 flex items-center justify-center bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:scale-[1.02] transition-all uppercase tracking-widest text-xs">
                            ACOMPANHAR PEDIDO
                        </Link>
                        <Link href={`/${slug}`} className="h-16 flex items-center justify-center bg-white border border-slate-200 text-slate-500 rounded-2xl font-black hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">
                            VOLTAR PARA O INÍCIO
                        </Link>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Resumo do Pedido (Sticky lateral) */}
          {step !== "success" && (
            <div className="lg:col-span-1">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm sticky top-28">
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center justify-between">
                        Cesta <span className="text-[10px] bg-slate-50 px-2 py-1 rounded-lg text-slate-400 font-black uppercase">{items.length} itens</span>
                    </h3>
                    
                    <div className="space-y-4 mb-8 max-h-48 overflow-y-auto no-scrollbar pr-2">
                        {items.map((item: any, idx) => (
                            <div key={idx} className="flex justify-between items-center group">
                                <div className="flex-1 pr-4">
                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{item.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.quantity}x {formatCurrency(item.price)}</p>
                                        {item.addons?.map((a: any, i: number) => (
                                            <span key={i} className="text-[8px] font-black text-primary uppercase">
                                                • {a.quantity > 1 ? `${a.quantity}x ` : ""}{a.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <p className="font-black text-slate-800 text-sm tracking-tighter">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3 pt-6 border-t border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Subtotal</span>
                            <span className="font-black text-slate-700 tracking-tighter">{formatCurrency(subtotal)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                            <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                                {deliveryMode === 'DELIVERY' ? 'Entrega' : 'Taxas'}
                            </span>
                            <span className={cn("font-black tracking-tighter", deliveryFee > 0 ? "text-slate-700" : "text-emerald-500")}>
                                {deliveryFee > 0 ? formatCurrency(deliveryFee) : "Grátis"}
                            </span>
                        </div>

                        <div className="h-[1px] bg-slate-50 my-2" />
                        
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Geral</p>
                                <p className="text-4xl font-black text-primary tracking-tighter leading-none">{formatCurrency(total)}</p>
                            </div>
                        </div>
                    </div>

                    {isBelowMinimum && deliveryMode === 'DELIVERY' && (
                        <div className="mt-6 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3">
                            <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">
                                Mínimo p/ Entrega: {formatCurrency(minOrderValue)}. <br/> Faltam {formatCurrency(minOrderValue - subtotal)}
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
            "p-6 rounded-3xl border-2 text-left transition-all duration-300 flex items-center gap-4 group",
            active 
                ? "bg-primary/5 border-primary shadow-lg shadow-primary/5 ring-4 ring-primary/5" 
                : "bg-white border-slate-100 hover:border-slate-200"
        )}
    >
        <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
            active ? "bg-primary text-white scale-110 shadow-lg" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
        )}>
            {icon}
        </div>
        <div className="flex-1">
            <h4 className={cn(
                "font-black uppercase tracking-tighter transition-colors",
                active ? "text-primary" : "text-slate-800"
            )}>
                {title}
            </h4>
            <p className={cn(
                "text-xs font-bold leading-relaxed",
                active ? "text-primary/70" : "text-slate-400"
            )}>
                {description}
            </p>
        </div>
        {active && (
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <CheckCircle2 size={16} className="text-white" />
            </div>
        )}
    </button>
  );
}

function InputGroup({ label, icon, value, onChange, placeholder }: any) {
    return (
        <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                        {icon}
                    </div>
                )}
                <input 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                        "w-full h-16 bg-slate-50 border border-transparent rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300",
                        icon ? "pl-14" : "px-6"
                    )}
                />
            </div>
        </div>
    );
}
