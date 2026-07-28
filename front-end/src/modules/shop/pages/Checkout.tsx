"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "../../../core/stores/useCartStore";
import { useLocationStore } from "../../../core/stores/useLocationStore";
import { useSettings } from "../../../core/hooks/useSettings";
import { useHasHydrated } from "../../../core/hooks/useHasHydrated";
import { Footer } from "../components/layout/Footer";
import { formatCurrency, cn, normalizeMoneyInput, parseMoneyInput, formatMoneyInputRealtime } from "../../../shared/utils";
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
  MessageCircle,
  Plus,
  Clock
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
import PixPayment from "../components/payment/PixPayment";
import { shopErrorToastOptions, shopSuccessToastOptions } from "../utils/toast";

gsap.registerPlugin(ScrollTrigger);

type Step = "mode" | "customer" | "address" | "payment" | "review" | "pix" | "success";
type DeliveryMode = "DELIVERY" | "PICKUP" | "DINE_IN";
type CheckoutPaymentMethod = "PIX" | "CASH" | "CREDIT" | "DEBIT";
const BRAZIL_BANKNOTES = [2, 5, 10, 20, 50, 100, 200] as const;
const CHANGE_MAX_EXTRA = 100;

const canComposeAmountWithBanknotes = (amount: number) => {
  const target = Math.round(amount);
  if (target <= 0) return false;

  const reachable = Array(target + 1).fill(false);
  reachable[0] = true;

  for (let value = 1; value <= target; value += 1) {
    reachable[value] = BRAZIL_BANKNOTES.some((note) => value >= note && reachable[value - note]);
  }

  return reachable[target];
};

export default function Checkout() {
  const [step, setStep] = useState<Step>("mode");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [createdOrderId, setCreatedOrderIdState] = useState<number | null>(null);
  const [orderCreatedId, setOrderCreatedId] = useState<number | null>(null);
  const [pendingPixOrderData, setPendingPixOrderData] = useState<any | null>(null);
  const [isCepLoading, setIsCepLoading] = useState(false);

  const hasHydrated = useHasHydrated();
  const { items, getSubtotal, clearCart, syncTenantCart } = useCartStore();
  const { address: savedAddress } = useLocationStore();
  const cartItems = hasHydrated ? items : [];
  const { settings } = useSettings();
  const storeLatitude = Number(settings?.latitude);
  const storeLongitude = Number(settings?.longitude);
  const hasStoreCoordinates =
    Number.isFinite(storeLatitude) &&
    Number.isFinite(storeLongitude) &&
    !(storeLatitude === 0 && storeLongitude === 0);
  const router = useRouter();
  const [slug, setSlug] = useState<string>("");
  const rootRef = useRef<HTMLDivElement>(null);
  const submissionLockRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const getOrderIdempotencyKey = () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
    return idempotencyKeyRef.current;
  };

  useEffect(() => {
    setSlug(getTenantSlug());
    syncTenantCart();
  }, [syncTenantCart]);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Animação condicional para evitar avisos de target não encontrado
      if (document.querySelector(".checkout-header")) {
        tl.from(".checkout-header", { y: -18, opacity: 0, duration: 0.7 });
      }
      
      if (document.querySelector(".checkout-progress")) {
        tl.from(".checkout-progress", { y: 18, opacity: 0, duration: 0.7 }, "-=0.2");
      }
      
      if (document.querySelector(".checkout-step-panel")) {
        tl.from(".checkout-step-panel", { y: 28, opacity: 0, duration: 0.8, stagger: 0.1 }, "-=0.35");
      }
      
      if (document.querySelector(".checkout-summary")) {
        tl.from(".checkout-summary", { x: 20, opacity: 0, duration: 0.8 }, "-=0.45");
      }
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
  const isPixAvailable = Boolean(settings?.pixEnabled);
  const isBelowMinimum = subtotal < minOrderValue;
  const isOpenNow = (typeof settings?.isOpen === "boolean"
    ? settings.isOpen
    : (hasHydrated ? isRestaurantOpenNow(settings?.operatingHours) : false))
    && settings?.hasCashierSession !== false;
  const nextOpeningLabel = settings?.nextOpeningLabel || (hasHydrated
    ? getNextOpeningLabel(settings?.operatingHours)
    : "Sem próximos horários");
  const estimatedDeliveryMinutes = settings?.deliveryEtaMinutes || 35;
  const maxPlausibleChangeFor = Math.ceil(total) + CHANGE_MAX_EXTRA;
  const nextValidChangeNote = (() => {
    for (let value = Math.ceil(total + 1); value <= maxPlausibleChangeFor; value += 1) {
      if (canComposeAmountWithBanknotes(value)) return value;
    }
    return null;
  })();
  const acceptedNotesLabel = BRAZIL_BANKNOTES.map((note) => formatCurrency(note)).join(", ");

  const getChangeValidationError = (changeVal: number) => {
    if (nextValidChangeNote === null) {
      return "Não há valor de troco plausível para este pedido. Use valor exato ou outro pagamento.";
    }

    if (!changeVal || changeVal <= 0) {
      return "Informe o valor para troco.";
    }

    if (Math.round(changeVal * 100) % 100 !== 0) {
      return "Para troco em dinheiro, informe um valor sem centavos (ex.: 300,00).";
    }

    if (changeVal <= total) {
      return `O valor para troco deve ser maior que o total (${formatCurrency(total)}).`;
    }

    if (changeVal > maxPlausibleChangeFor) {
      return `Troco muito acima do total. Limite para este pedido: ${formatCurrency(maxPlausibleChangeFor)}.`;
    }

    if (!canComposeAmountWithBanknotes(changeVal)) {
      return `Informe um valor possível com cédulas do Brasil (${acceptedNotesLabel}).`;
    }

    return null;
  };

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
    paymentMethod: "CASH" as CheckoutPaymentMethod,
    needsChange: false,
    changeFor: "",
    cpf: ""
  });

  // Solução para erro de Hidratação (Hydration Error #418) e preenchimento inicial
  useEffect(() => {
    const savedCustomer = localStorage.getItem("@FoodSystem:customer");
    const savedPhone = localStorage.getItem("@FoodSystem:customerPhone");
    if (savedCustomer || savedPhone) {
      try {
        const customer = savedCustomer ? JSON.parse(savedCustomer) : {};
        setFormData(prev => ({
          ...prev,
          customerName: customer.name || prev.customerName,
          phone: savedPhone || customer.phone || prev.phone,
          email: customer.email || prev.email,
        }));
      } catch (e) {
        console.error("Erro ao carregar dados salvos", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isPixAvailable && formData.paymentMethod === "PIX") {
      setFormData((prev) => ({ ...prev, paymentMethod: "CASH" }));
    }
  }, [isPixAvailable, formData.paymentMethod]);

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
          storeLatitude,
          storeLongitude,
          customerLat,
          customerLng
        );

        const radius = settings.deliveryRadius || 5;

        if (distance > radius) {
          toast.error(`Infelizmente seu endereço está fora do nosso raio de entrega (${radius}km). Sua distância: ${distance.toFixed(1)}km`, {
            ...shopErrorToastOptions,
            duration: 5000,
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
      } catch (e) { }
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
      const customerToSave = {
        name: formData.customerName,
        phone: formData.phone,
        email: formData.email
      };
      
      localStorage.setItem("@FoodSystem:customer", JSON.stringify(customerToSave));
      localStorage.setItem("@FoodSystem:customerPhone", formData.phone);
      
      const currentTenantSlug = slug || getTenantSlug();
      localStorage.setItem(`@FoodSystem:customer:${currentTenantSlug}`, JSON.stringify(customerToSave));

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
      if (deliveryMode === "DELIVERY" && hasStoreCoordinates && Number(settings?.deliveryRadius) > 0) {
        handleValidateDistance();
        return;
      }

      setStep("payment");
      return;
    }

    if (step === "payment") {
      if (formData.paymentMethod === 'CASH' && formData.needsChange) {
        const changeVal = parseMoneyInput(formData.changeFor);
        const changeError = getChangeValidationError(changeVal);
        if (changeError) {
          toast.error(changeError);
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
    else router.push(`/${slug}`);
  };

  const handleFinishOrder = async () => {
    if (submissionLockRef.current) return;

    if (!isOpenNow) {
      const isCashierClosed = settings?.isOpen && settings?.hasCashierSession === false;
      toast.error(
        isCashierClosed
          ? "O restaurante ainda não abriu o caixa para este turno. Tente novamente em instantes."
          : `Loja fechada no momento. ${
              nextOpeningLabel === "Sem próximos horários"
                ? "Sem previsão de abertura."
                : `Abre ${nextOpeningLabel}.`
            }`
      );
      return;
    }

    if (isBelowMinimum && deliveryMode === "DELIVERY") {
      toast.error(`O valor mínimo para entrega é ${formatCurrency(minOrderValue)}`);
      return;
    }

    if (formData.paymentMethod === 'CASH' && formData.needsChange) {
      const changeVal = parseMoneyInput(formData.changeFor);
      const changeError = getChangeValidationError(changeVal);
      if (changeError) {
        toast.error(changeError);
        return;
      }
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
    try {
      const orderData = {
        idempotencyKey: getOrderIdempotencyKey(),
        customerAccessToken: localStorage.getItem(
          `@FoodSystem:customerAccessToken:${slug || getTenantSlug()}`
        ) || undefined,
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
        changeFor: (formData.paymentMethod === 'CASH' && formData.needsChange && formData.changeFor) 
          ? String(parseMoneyInput(formData.changeFor)) 
          : null,
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

      if (orderData.paymentMethod === 'PIX' && deliveryMode !== 'DINE_IN') {
        setPendingPixOrderData(orderData);
        setStep("pix");
      } else {
        const response = await api.post("/orders", orderData);
        if (response.customerAccessToken) {
          localStorage.setItem(
            `@FoodSystem:customerAccessToken:${slug || getTenantSlug()}`,
            response.customerAccessToken,
          );
        }
        setCreatedOrder(response);
        setOrderCreatedId(response.id);
        setCreatedOrderIdState(response.id);
        setStep("success");
        clearCart();
        toast.success("Pedido enviado com sucesso!", shopSuccessToastOptions);
      }
    } catch (error: any) {
      console.error("Order error:", error);
      toast.error(error.message || "Erro ao enviar pedido. Tente novamente.", shopErrorToastOptions);
    } finally {
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppNotify = () => {
    if (!createdOrder) return;
    const msg = formatWhatsAppMessage(createdOrder, settings?.storeName || "FoodSystem");
    // Remove o número padrão 5511... e usa uma string vazia como fallback para evitar números inválidos
    const storePhone = settings?.phone || "";
    if (!storePhone) {
      toast.error("Telefone da loja não configurado.", shopErrorToastOptions);
      return;
    }
    sendToWhatsApp(storePhone, msg);
  };

  if (items.length === 0 && step !== "success") {
    return (
      <div ref={rootRef} className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8">
        <div className="relative w-32 h-32 mb-12">
          <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] rotate-6 animate-pulse" />
          <div className="relative w-32 h-32 bg-slate-50 rounded-[2.5rem] border border-slate-200 flex items-center justify-center shadow-xl shadow-slate-300/40">
            <ShoppingBag size={48} className="text-slate-200" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight mb-4 text-center">
          Sua Cesta está Vazia
        </h2>
        <p className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mb-12 text-center max-w-xs leading-relaxed">
          Adicione itens ao seu pedido para continuar.
        </p>

        <button
          onClick={() => router.push(`/${slug}`)}
          className="h-14 px-8 bg-slate-950 text-white rounded-2xl font-body font-bold flex items-center justify-center gap-3 shadow-2xl shadow-slate-950/20 hover:bg-black active:scale-[0.98] transition-all uppercase tracking-widest text-label"
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
  // pix e success ficam fora da barra de progresso
  const isPixStep = step === "pix";
  const shouldShowMobileCheckoutBar = step !== "success" && !isPixStep;
  const deliveryModeLabel = deliveryMode === "DELIVERY"
    ? "Entrega"
    : deliveryMode === "PICKUP"
      ? "Retirada"
      : "Consumo no local";
  const getPaymentMomentLabel = (mode: DeliveryMode, method: CheckoutPaymentMethod) => {
    if (method === "PIX") return "Pagamento agora via PIX";
    if (mode === "PICKUP") return "Pagamento na retirada";
    if (mode === "DINE_IN") return "Pagamento no local";
    return "Pagamento na entrega";
  };
  const paymentMethodLabels: Record<CheckoutPaymentMethod, string> = {
    PIX: "Pix",
    CASH: "Dinheiro",
    CREDIT: "Credito",
    DEBIT: "Debito",
  };
  const selectedPaymentLabel = paymentMethodLabels[formData.paymentMethod];
  const reviewPaymentMethodLabel = deliveryMode === "DINE_IN" ? "A definir no local" : selectedPaymentLabel;
  const reviewPaymentMomentLabel = getPaymentMomentLabel(deliveryMode, formData.paymentMethod);
  const successDeliveryLabel = deliveryModeLabel;
  const successPaymentMethodLabel = deliveryMode === "DINE_IN"
    ? "A definir no local"
    : formData.paymentMethod === "CASH" && formData.needsChange && formData.changeFor
      ? `${selectedPaymentLabel} (Troco p/ ${formData.changeFor})`
      : selectedPaymentLabel;
  const successPaymentMomentLabel = getPaymentMomentLabel(deliveryMode, formData.paymentMethod);
  const successEtaLabel = deliveryMode === "DINE_IN"
    ? "Atendimento imediato"
    : `${estimatedDeliveryMinutes} min`;
  const successAddressLabel = deliveryMode === "DELIVERY"
    ? `${formData.street || "Endereco"}, ${formData.number || "s/n"}`
    : deliveryMode === "PICKUP"
      ? "Retirada no balcao"
      : "Consumo na unidade";

  return (
    <div ref={rootRef} className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header Simplificado de Checkout */}
      {/* Header Simplificado de Checkout Premium */}
      <header className="checkout-header fixed inset-x-0 top-0 bg-slate-100/90 backdrop-blur-md border-b border-slate-200 z-50 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="container mx-auto px-4 md:px-6 h-14 md:h-24 flex items-center justify-between max-w-5xl">
          <button
            onClick={handleBack}
            className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100 group shrink-0"
          >
            <ChevronLeft size={18} className="md:size-6 group-hover:-translate-x-1 transition-transform" />
          </button>

          <div className="flex flex-col items-center min-w-0">
            <h1 className="font-display font-bold text-slate-950 uppercase tracking-tight text-[14px] md:text-heading-3">
              {step === "success" ? "Confirmação" : "Checkout"}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 md:mt-2">
              <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
              <span className="text-[9px] md:text-label font-body font-medium text-slate-400 uppercase tracking-widest whitespace-nowrap">Checkout Seguro</span>
            </div>
          </div>

          <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-primary/30 shrink-0">
            <Zap size={18} className="md:size-6" fill="currentColor" />
          </div>
        </div>
      </header>

      <main
        className={cn(
          "container mx-auto px-4 md:px-6 pt-24 md:pt-32 max-w-5xl flex-1",
          shouldShowMobileCheckoutBar ? "pb-24 md:pb-16" : "pb-6 md:pb-16"
        )}
      >
        {!isOpenNow && (
          <div className="checkout-summary mb-10 rounded-xl md:rounded-2xl border border-rose-100 bg-rose-50/70 p-5 text-rose-700">
            <p className="text-label font-body font-bold">Loja fechada no momento</p>
            <p className="text-[11px] font-body font-medium mt-1">
              {nextOpeningLabel === "Sem próximos horários"
                ? "Sem horário de abertura disponível."
                : `Abre ${nextOpeningLabel}`}
            </p>
          </div>
        )}

        {/* PROGRESS BAR LUXURY */}
        {step !== "success" && (
          <div className="checkout-progress flex items-center justify-between relative mb-6 md:mb-20 px-1 md:px-4">
            {stepsList.map((s, idx) => {
              const isCompleted = stepsList.findIndex(stepObj => stepObj.key === step) > idx;
              const isActive = s.key === step;
              return (
                <div key={s.key} className="flex flex-col items-center gap-1.5 md:gap-3 flex-1 relative">
                  <div className={cn(
                    "w-8 h-8 md:w-12 md:h-12 rounded-2xl md:rounded-[1.25rem] flex items-center justify-center transition-all duration-700 z-10 font-mono font-medium text-[11px] md:text-numeric md:text-lg",
                    isActive ? "bg-slate-950 text-white scale-110 shadow-2xl shadow-slate-950/20" :
                      isCompleted ? "bg-emerald-500 text-white" : "bg-slate-50 border border-slate-200 text-slate-300 shadow-sm"
                  )}>
                    {isCompleted ? <CheckCircle2 size={14} className="md:size-6" /> : (idx + 1).toString().padStart(2, "0")}
                  </div>
                  <span className={cn(
                    "font-body font-bold uppercase text-[7px] md:text-[10px] tracking-tight md:tracking-widest text-center leading-none",
                    isActive ? "text-slate-950" : "text-slate-300"
                  )}>
                    {s.label}
                  </span>
                  {idx < stepsList.length - 1 && (
                    <div className="absolute top-4 md:top-6 left-1/2 w-full h-px bg-slate-200 z-0">
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
                  <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 text-primary rounded-2xl md:rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10 shrink-0">
                      <ShoppingBag size={18} className="md:size-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[16px] md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight leading-none">Como receber?</h2>
                      <p className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-wider mt-0.5 md:mt-1">Escolha a forma de entrega</p>
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
                    className="hidden lg:flex h-14 md:h-20 w-full bg-slate-950 text-white rounded-xl md:rounded-2xl font-body font-bold items-center justify-center gap-4 mt-8 md:mt-12 shadow-2xl shadow-slate-950/20 hover:bg-slate-900 transition-all text-label tracking-widest uppercase group"
                  >
                    AVANÇAR PARA IDENTIFICAÇÃO <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}

              {/* PASSO 2: IDENTIFICAÇÃO (CADASTRO) */}
              {step === "customer" && (
                <motion.div key="customer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 text-white rounded-2xl md:rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10 shrink-0">
                      <User size={18} className="md:size-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[16px] md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight leading-none">Seus Dados</h2>
                      <p className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-wider mt-0.5 md:mt-1">Para contato e entrega</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 p-5 md:p-10 shadow-xl shadow-slate-300/40 space-y-5 md:space-y-8">
                    <p className="text-[10px] md:text-label font-body text-slate-400 uppercase tracking-[0.06em] leading-relaxed">
                      Seus dados são usados apenas para confirmação e entrega do pedido.
                    </p>

                    <InputGroup
                      label="Nome Completo *"
                      icon={<User size={18} />}
                      value={formData.customerName}
                      onChange={(v: string) => setFormData({ ...formData, customerName: v })}
                      placeholder="Ex: João Silva"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputGroup
                        label="Celular / WhatsApp *"
                        icon={<Phone size={18} />}
                        value={formData.phone}
                        onChange={(v: string) => handlePhoneChange({ target: { value: v } } as any)}
                        placeholder="(00) 00000-0000"
                      />
                      <InputGroup
                        label="E-mail (opcional)"
                        icon={<Mail size={18} />}
                        value={formData.email}
                        onChange={(v: string) => setFormData({ ...formData, email: v })}
                        placeholder="seuemail@exemplo.com"
                      />
                    </div>

                    <InputGroup
                      label="CPF para Nota Fiscal (Opcional)"
                      icon={<ClipboardCheck size={18} />}
                      value={formData.cpf}
                      onChange={(v: string) => handleCpfChange({ target: { value: v } } as any)}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={isDistanceValidating}
                    className="hidden lg:flex h-14 md:h-20 w-full bg-slate-950 text-white rounded-xl md:rounded-2xl font-body font-bold items-center justify-center gap-4 mt-8 md:mt-12 shadow-2xl shadow-slate-950/20 hover:bg-slate-900 transition-all disabled:opacity-50 text-label tracking-widest uppercase group"
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
                  <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 text-white rounded-2xl md:rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10 shrink-0">
                      <MapPin size={18} className="md:size-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[16px] md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight leading-none">Endereço</h2>
                      <p className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-wider mt-0.5 md:mt-1">Onde você quer receber?</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 p-5 md:p-10 shadow-xl shadow-slate-300/40 space-y-5 md:space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      <div className="md:col-span-1">
                        <div className="space-y-1.5 md:space-y-3 group">
                          <label className="text-[9px] md:text-label font-body font-medium text-slate-400 uppercase tracking-[0.18em] ml-1 group-focus-within:text-slate-950 transition-colors block">
                            CEP
                          </label>
                          <div className="relative">
                            <input
                              value={formData.zipCode}
                              onChange={handleCepChange}
                              onBlur={handleCepBlur}
                              placeholder="00000-000"
                              className="w-full h-12 md:h-16 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl focus:bg-slate-50 focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950/20 transition-all font-mono text-sm md:text-numeric text-slate-700 outline-none px-5 md:px-6"
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
                        <InputGroup label="Rua / Logradouro *" value={formData.street} onChange={(v: string) => setFormData({ ...formData, street: v })} placeholder="Ex: Avenida Brigadeiro Faria Lima" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      <div className="md:col-span-4">
                        <InputGroup label="Número *" value={formData.number} onChange={(v: string) => setFormData({ ...formData, number: v })} placeholder="123" />
                      </div>
                      <div className="md:col-span-8">
                        <InputGroup label="Bairro *" value={formData.neighborhood} onChange={(v: string) => setFormData({ ...formData, neighborhood: v })} placeholder="Nome do bairro" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputGroup label="Cidade" value={formData.city} onChange={(v: string) => setFormData({ ...formData, city: v })} placeholder="Sua cidade" />
                      <InputGroup label="Complemento" value={formData.complement} onChange={(v: string) => setFormData({ ...formData, complement: v })} placeholder="Apto, Bloco, etc." />
                    </div>

                    <InputGroup label="Ponto de Referência" value={formData.reference} onChange={(v: string) => setFormData({ ...formData, reference: v })} placeholder="Perto de onde?" />
                  </div>

                  <button
                    onClick={handleNext}
                    className="hidden lg:flex h-14 md:h-20 w-full bg-slate-950 text-white rounded-xl md:rounded-2xl font-body font-bold items-center justify-center gap-4 mt-8 md:mt-12 shadow-2xl shadow-slate-950/20 hover:bg-slate-900 transition-all text-label tracking-widest uppercase group"
                  >
                    CONTINUAR PARA PAGAMENTO <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}

              {/* PASSO 4: PAGAMENTO */}
              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 text-white rounded-2xl md:rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10 shrink-0">
                      <CreditCard size={18} className="md:size-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[16px] md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight leading-none">Pagamento</h2>
                      <p className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-wider mt-0.5 md:mt-1">Como deseja pagar?</p>
                    </div>
                  </div>

                  {!isPixAvailable && (
                    <div className="mb-5 md:mb-7 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-4">
                      <p className="text-[10px] md:text-label font-body font-bold text-amber-700 uppercase tracking-[0.12em]">
                        PIX indisponível no momento
                      </p>
                      <p className="mt-1 text-[11px] md:text-body font-body font-medium text-amber-800">
                        Use dinheiro, crédito ou débito. O PIX será habilitado quando a chave da loja estiver configurada.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-5">
                    {isPixAvailable && (
                      <SelectOption
                        active={formData.paymentMethod === 'PIX'}
                        onClick={() => setFormData({ ...formData, paymentMethod: 'PIX' })}
                        icon={<Zap size={24} className="text-primary fill-primary/20" />}
                        title="PIX"
                        description="Aprovação instantânea"
                      />
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <SelectOption
                        active={formData.paymentMethod === 'CREDIT'}
                        onClick={() => setFormData({ ...formData, paymentMethod: 'CREDIT' })}
                        icon={<CreditCard size={24} />}
                        title="Crédito"
                        description={deliveryMode === "PICKUP" ? "Maquininha na retirada" : "Maquininha no recebimento"}
                      />
                      <SelectOption
                        active={formData.paymentMethod === 'DEBIT'}
                        onClick={() => setFormData({ ...formData, paymentMethod: 'DEBIT' })}
                        icon={<CreditCard size={24} />}
                        title="Débito"
                        description={deliveryMode === "PICKUP" ? "Maquininha na retirada" : "Maquininha no recebimento"}
                      />
                    </div>
                    <SelectOption
                      active={formData.paymentMethod === 'CASH'}
                      onClick={() => setFormData({ ...formData, paymentMethod: 'CASH' })}
                      icon={<ShoppingBag size={24} />}
                      title="Dinheiro"
                      description={deliveryMode === "PICKUP" ? "Pagamento na retirada" : "Pagamento no recebimento"}
                    />

                    {formData.paymentMethod === 'CASH' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-50 rounded-xl md:rounded-2xl p-8 border border-slate-100 mt-2 shadow-inner"
                      >
                        <div className="flex items-center justify-between gap-6">
                          <div>
                            <p className="text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight">Precisa de troco?</p>
                            <p className="text-label font-body font-medium text-slate-500 uppercase tracking-[0.06em] mt-1">Total: {formatCurrency(total)}</p>
                          </div>
                          <div className="flex bg-slate-50 p-1.5 rounded-lg border border-slate-200 shadow-sm">
                            <button
                              onClick={() => setFormData({ ...formData, needsChange: false })}
                              className={cn(
                                "px-6 py-3 rounded-lg text-label font-body font-bold transition-all",
                                !formData.needsChange ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20" : "text-slate-400 hover:text-slate-600"
                              )}
                            >NÃO</button>
                            <button
                              onClick={() => setFormData({ ...formData, needsChange: true })}
                              className={cn(
                                "px-6 py-3 rounded-lg text-label font-body font-bold transition-all",
                                formData.needsChange ? "bg-primary text-slate-950 shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-600"
                              )}
                            >SIM</button>
                          </div>
                        </div>

                        {formData.needsChange && (
                          <div className="mt-8 pt-8 border-t border-slate-200">
                            <p className="text-label font-body font-bold text-slate-950 uppercase tracking-widest mb-4">Troco para:</p>
                            <div className="relative">
                              <span className="absolute left-6 top-[50%] translate-y-[-50%] text-slate-400 font-mono text-lg">R$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={formData.changeFor}
                                onChange={(e) => {
                                  const val = formatMoneyInputRealtime(e.target.value);
                                  setFormData({ ...formData, changeFor: val });
                                }}
                                className={cn(
                                  "w-full h-16 pl-16 pr-6 bg-slate-50 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950/20 font-mono text-numeric text-xl text-slate-950 outline-none transition-all",
                                  formData.needsChange && !!getChangeValidationError(parseMoneyInput(formData.changeFor)) && "border-rose-500 ring-4 ring-rose-500/5 text-rose-500"
                                )}
                              />
                            </div>
                            {formData.changeFor && parseMoneyInput(formData.changeFor) <= total && (
                              <p className="text-label font-body font-medium text-rose-500 mt-3 uppercase tracking-tight flex items-center gap-2">
                                <AlertCircle size={14} />
                                O valor deve superar {formatCurrency(total)}
                              </p>
                            )}
                            {formData.changeFor && parseMoneyInput(formData.changeFor) > total && !canComposeAmountWithBanknotes(parseMoneyInput(formData.changeFor)) && (
                              <p className="text-label font-body font-medium text-rose-500 mt-3 uppercase tracking-tight flex items-center gap-2">
                                <AlertCircle size={14} />
                                Informe valor possível com cédulas ({acceptedNotesLabel})
                              </p>
                            )}
                            {formData.changeFor && nextValidChangeNote === null && (
                              <p className="text-label font-body font-medium text-rose-500 mt-3 uppercase tracking-tight flex items-center gap-2">
                                <AlertCircle size={14} />
                                Não há valor plausível de troco para este pedido
                              </p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  <button
                    onClick={handleNext}
                    className="hidden lg:flex h-14 md:h-20 w-full bg-slate-950 text-white rounded-xl md:rounded-2xl font-body font-bold items-center justify-center gap-4 mt-8 md:mt-12 shadow-2xl shadow-slate-950/20 hover:bg-slate-900 transition-all text-label tracking-widest uppercase group"
                  >
                    REVISAR PEDIDO <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}

              {/* PASSO 5: REVISÃO FINAL */}
              {step === "review" && (
                <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 text-white rounded-2xl md:rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-950/10 shrink-0">
                      <ClipboardCheck size={18} className="md:size-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[16px] md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight leading-none">Revisão</h2>
                      <p className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-wider mt-0.5 md:mt-1">Confirme seu pedido</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 p-4 md:p-10 shadow-2xl shadow-slate-300/40 space-y-5 md:space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10">
                      <div>
                        <h4 className="text-[10px] md:text-label font-body font-bold text-slate-300 uppercase tracking-[0.15em] mb-3 md:mb-4">Cliente</h4>
                        <p className="font-display font-bold text-slate-950 text-xl md:text-heading-3 uppercase tracking-tight leading-tight mb-2">{formData.customerName}</p>
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
                          <Phone size={14} className="text-slate-400" />
                          <p className="text-slate-400 font-mono font-bold text-[11px] tracking-tight">{formData.phone}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] md:text-label font-body font-bold text-slate-300 uppercase tracking-[0.15em] mb-3 md:mb-4">Detalhes do Pedido</h4>
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <div className="px-3 md:px-4 py-2 bg-slate-950 text-white rounded-lg md:rounded-xl text-[11px] md:text-label font-body font-bold uppercase tracking-[0.08em] md:tracking-widest max-w-full wrap-break-word">
                              {deliveryModeLabel}
                            </div>
                            <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-primary" />
                            <div className="px-3 md:px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg md:rounded-xl text-[11px] md:text-label font-body font-bold uppercase tracking-[0.08em] md:tracking-widest max-w-full wrap-break-word">
                              {reviewPaymentMethodLabel}
                            </div>
                          </div>
                          <p className="text-label font-body font-medium text-slate-500 uppercase tracking-[0.06em] leading-relaxed border-l-2 border-primary/20 pl-4">
                            {reviewPaymentMomentLabel}
                          </p>
                          {formData.paymentMethod === 'CASH' && formData.needsChange && formData.changeFor && (
                            <p className="text-label font-body font-bold text-primary uppercase tracking-[0.06em] mt-1 italic">
                              Troco para {formData.changeFor}
                            </p>
                          )}
                          {deliveryMode === 'DINE_IN' && (
                            <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] leading-relaxed italic border-l-2 border-primary/20 pl-4">
                              O pagamento será feito diretamente com o atendente na mesa.
                            </p>
                          )}
                          <div className="mt-2 md:mt-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                            <p className="text-[10px] font-body font-black uppercase tracking-[0.2em] text-slate-400">Tempo estimado</p>
                            <p className="text-xl md:text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight mt-1">
                              {estimatedDeliveryMinutes} min
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {deliveryMode === 'DELIVERY' && (
                      <div className="pt-8 border-t border-slate-100">
                        <h4 className="text-label font-body font-bold text-slate-300 uppercase tracking-[0.15em] mb-5">Endereço de Entrega</h4>
                        <div className="bg-slate-50 p-8 rounded-xl md:rounded-2xl border border-slate-200 group hover:bg-slate-100 hover:shadow-xl hover:shadow-slate-300/25 transition-all duration-500">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 text-slate-300 group-hover:text-slate-950 transition-colors">
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
                      "hidden lg:flex h-18 md:h-24 w-full rounded-xl md:rounded-2xl font-body font-bold flex-col items-center justify-center gap-1 mt-8 md:mt-12 shadow-2xl transition-all duration-300 disabled:opacity-50",
                      isBelowMinimum && deliveryMode === 'DELIVERY'
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                        : "bg-slate-950 text-white shadow-slate-950/20 hover:bg-slate-900 active:scale-[0.98] group"
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin text-primary" size={32} />
                    ) : (
                      <>
                        <span className="text-[10px] font-body font-bold text-primary uppercase tracking-[0.3em] mb-1">Finalizar Pedido</span>
                        <div className="flex items-center gap-4">
                          <span className="text-heading-2 font-display font-bold uppercase tracking-tight">CONFIRMAR PEDIDO</span>
                          <div className="w-px h-6 bg-white/20" />
                          <span className="text-heading-2 font-mono font-bold text-primary">{formatCurrency(total)}</span>
                        </div>
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* PASSO PIX: QR CODE */}
              {step === "pix" && (
                <motion.div key="pix" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500 text-white rounded-2xl md:rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-emerald-500/20 shrink-0">
                      <Zap size={18} className="md:size-6" fill="currentColor" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[16px] md:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight leading-none">Pague com PIX</h2>
                      <p className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-wider mt-0.5 md:mt-1">Escaneie o QR Code para confirmar</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 p-6 md:p-10 shadow-xl shadow-slate-300/30">
                    <PixPayment
                      total={Number(pendingPixOrderData?.total || total)}
                      storePhone={settings?.phone || ""}
                      storeName={settings?.storeName || "FoodSystem"}
                      isConfirming={isSubmitting}
                      onConfirmed={async () => {
                        if (submissionLockRef.current) return;

                        if (!pendingPixOrderData) {
                          toast.error("Não foi possível recuperar os dados do pedido. Tente novamente.", shopErrorToastOptions);
                          return;
                        }

                        submissionLockRef.current = true;
                        setIsSubmitting(true);
                        try {
                          const response = await api.post('/orders', pendingPixOrderData);
                          if (response.customerAccessToken) {
                            localStorage.setItem(
                              `@FoodSystem:customerAccessToken:${slug || getTenantSlug()}`,
                              response.customerAccessToken,
                            );
                          }
                          setCreatedOrder(response);
                          setOrderCreatedId(response.id);
                          setCreatedOrderIdState(response.id);
                          setPendingPixOrderData(null);
                          clearCart();
                          toast.success("Pedido enviado! A loja irá conferir o pagamento PIX manualmente.", shopSuccessToastOptions);
                          setStep("success");
                        } catch (error: any) {
                          console.error('Order error (pix confirm):', error);
                          toast.error(error.message || 'Erro ao concluir pedido. Tente novamente.', shopErrorToastOptions);
                        } finally {
                          submissionLockRef.current = false;
                          setIsSubmitting(false);
                        }
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {/* PASSO FINAL: SUCESSO - EXPERIÊNCIA PREMIUM */}
              {step === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 md:py-14 max-w-2xl mx-auto w-full">
                  <div className="relative w-28 h-28 md:w-36 md:h-36 mx-auto mb-8 md:mb-10">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
                      className="absolute inset-0 rounded-[3.5rem] border-2 border-emerald-500/30"
                    />
                    <div className="relative w-full h-full bg-emerald-50 text-emerald-500 rounded-[2.2rem] md:rounded-[3.5rem] flex items-center justify-center shadow-[0_24px_48px_rgba(16,185,129,0.15)] border border-emerald-100/50">
                      <CheckCircle2 size={52} strokeWidth={1.5} className="drop-shadow-sm md:size-18" />
                    </div>
                  </div>

                  <h2 className="text-heading-1 md:text-display font-display font-bold text-slate-950 uppercase tracking-tighter mb-3 text-center leading-none">
                    Pedido Confirmado
                  </h2>
                  <p className="text-label font-body font-medium text-slate-400 uppercase tracking-widest mb-6 md:mb-8 leading-relaxed text-center max-w-md mx-auto">
                    Pedido <span className="text-slate-950 font-mono font-bold">#{orderCreatedId}</span> recebido com sucesso. Acompanhe os próximos passos abaixo.
                  </p>

                  <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Clock size={19} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">Aguardando confirmação da loja</p>
                      <p className="mt-1 text-xs font-medium text-amber-900">Você pode sair desta tela. O andamento ficará disponível em Meus pedidos.</p>
                    </div>
                  </div>

                  <div className="rounded-xl md:rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-6 mb-6 md:mb-8">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="rounded-lg md:rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                        <p className="text-[10px] font-body font-bold uppercase tracking-[0.12em] text-slate-400">Tipo</p>
                        <p className="text-xs md:text-sm font-body font-bold text-slate-950 mt-1 uppercase">{successDeliveryLabel}</p>
                      </div>
                      <div className="rounded-lg md:rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                        <p className="text-[10px] font-body font-bold uppercase tracking-[0.12em] text-slate-400">Pagamento</p>
                        <p className="text-xs md:text-sm font-body font-bold text-slate-950 mt-1 uppercase">{successPaymentMethodLabel}</p>
                        <p className="text-[10px] font-body font-medium uppercase tracking-[0.08em] text-slate-500 mt-1">{successPaymentMomentLabel}</p>
                      </div>
                      <div className="rounded-lg md:rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                        <p className="text-[10px] font-body font-bold uppercase tracking-[0.12em] text-slate-400">Previsao</p>
                        <p className="text-xs md:text-sm font-body font-bold text-slate-950 mt-1 uppercase">{successEtaLabel}</p>
                      </div>
                      <div className="rounded-lg md:rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                        <p className="text-[10px] font-body font-bold uppercase tracking-[0.12em] text-slate-400">Destino</p>
                        <p className="text-xs md:text-sm font-body font-bold text-slate-950 mt-1 uppercase truncate">{successAddressLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:gap-5">
                    <Link
                      href={`/${slug}/orders?order=${createdOrderId || orderCreatedId || ""}`}
                      className="h-16 md:h-18 flex items-center justify-center gap-3 bg-slate-950 text-white rounded-2xl font-body font-bold shadow-2xl shadow-slate-950/20 hover:bg-black active:scale-[0.98] transition-all uppercase tracking-widest text-xs md:text-sm"
                    >
                      <ShoppingBag size={19} />
                      Acompanhar pedido
                      <ChevronRight size={18} />
                    </Link>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={handleWhatsAppNotify}
                        className="h-14 md:h-16 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl font-body font-bold hover:bg-emerald-100 transition-all uppercase tracking-widest text-label"
                      >
                        <MessageCircle size={17} />
                        Falar com a loja
                      </button>
                      <Link href={`/${slug}`} className="h-14 md:h-16 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl font-body font-bold hover:bg-slate-100 transition-all uppercase tracking-widest text-label">
                        VOLTAR AO MENU
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Resumo do Pedido - Curadoria Sticky lateral (somente na revisão) */}
          {step === "review" && (
            <div className="lg:col-span-1 pb-28 lg:pb-0">
              <div className="bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 p-10 shadow-[0_20px_50px_rgba(15,23,42,0.12)] sticky top-32">
                <h3 className="font-display font-bold text-heading-3 text-slate-950 uppercase tracking-tight mb-8 flex items-center justify-between">
                  Sua Cesta <span className="text-label font-body font-bold bg-slate-100 px-3 py-1.5 rounded-xl text-slate-500 uppercase tracking-widest text-[10px]">{items.length} ITENS</span>
                </h3>

                <Link 
                  href={`/${slug}`}
                  className="w-full h-12 mb-8 flex items-center justify-center gap-2 rounded-lg md:rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all font-body font-bold text-[10px] uppercase tracking-widest shadow-sm group"
                >
                  <Plus size={14} className="text-primary group-hover:scale-110 transition-transform" />
                  ADICIONAR MAIS ITENS
                </Link>

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
                    <span className="font-body font-medium text-slate-400 uppercase text-label tracking-widest">Taxa de entrega</span>
                    <span className={cn("font-mono font-bold tracking-tighter", deliveryFee > 0 ? "text-slate-950" : "text-emerald-500")}>
                      {deliveryFee > 0 ? formatCurrency(deliveryFee) : "GRÁTIS"}
                    </span>
                  </div>

                  {formData.paymentMethod === 'CASH' && formData.needsChange && formData.changeFor && (
                    <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg md:rounded-xl border border-primary/10">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="font-body font-bold text-slate-900 uppercase text-[9px] tracking-widest">Troco solicitado</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-primary text-label">{formatCurrency(parseMoneyInput(formData.changeFor))}</span>
                        <span className="text-[8px] font-body font-medium text-slate-400 uppercase tracking-tighter mt-0.5">
                          Volta {formatCurrency(parseMoneyInput(formData.changeFor) - total)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="h-px bg-slate-50 my-4" />

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-label font-body font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 text-[10px]">Total da Compra</p>
                      <p className="text-2xl font-mono font-bold text-primary tracking-tighter leading-none">{formatCurrency(total)}</p>
                    </div>
                  </div>
                </div>

                {isBelowMinimum && deliveryMode === 'DELIVERY' && (
                  <div className="mt-8 p-6 bg-slate-950 rounded-xl md:rounded-2xl border border-slate-900 flex items-start gap-4">
                    <AlertCircle size={20} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.08em] leading-relaxed text-[10px]">
                      <span className="text-white font-bold">Pedido mínimo:</span> {formatCurrency(minOrderValue)}. <br />
                      Faltam {formatCurrency(minOrderValue - subtotal)} para atingir o mínimo.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {shouldShowMobileCheckoutBar && (
        <div className="lg:hidden fixed bottom-2 left-3 right-3 z-50">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 shadow-xl shadow-slate-300/30 flex items-center justify-between gap-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)" }}>
            <div>
              <p className="text-[9px] text-slate-400 uppercase">Total</p>
              <p className="text-base font-bold text-primary leading-tight">{formatCurrency(total)}</p>
              <p className="text-[9px] text-slate-400 uppercase mt-0.5">
                {String(stepsList.findIndex(s => s.key === step) + 1).padStart(2, '0')}/{stepsList.length} • {stepsList.find(s => s.key === step)?.label}
              </p>
            </div>
            <div>
              {step === 'review' ? (
                <button
                  onClick={handleFinishOrder}
                  disabled={isSubmitting || (isBelowMinimum && deliveryMode === 'DELIVERY')}
                  className={cn(
                    "h-10 px-4 rounded-lg font-body font-bold text-xs shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-60",
                    isBelowMinimum && deliveryMode === 'DELIVERY'
                      ? "bg-slate-100 text-slate-300 shadow-none"
                      : "bg-slate-950 text-white"
                  )}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "CONFIRMAR"}
                </button>
              ) : (
                <button onClick={handleNext} className="h-10 px-4 rounded-lg font-body font-bold text-xs bg-slate-950 text-white shadow-2xl">
                  {(() => {
                    if (step === 'mode') return 'AVANÇAR';
                    if (step === 'customer') return deliveryMode === 'DELIVERY' ? 'CONTINUAR' : 'REVISAR';
                    if (step === 'address') return 'CONTINUAR';
                    if (step === 'payment') return 'REVISAR';
                    return 'AVANÇAR';
                  })()}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === "success" && <Footer />}
    </div>
  );
}

function SelectOption({ active, onClick, title, description, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-4 md:p-8 rounded-xl md:rounded-2xl border-2 text-left transition-all duration-500 flex items-center gap-4 md:gap-6 group relative overflow-hidden",
        active
          ? "bg-slate-950 border-slate-950 shadow-2xl shadow-slate-950/20 ring-4 ring-slate-950/5"
          : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-300/25"
      )}
    >
      {active && (
        <motion.div
          layoutId="option-bg"
          className="absolute inset-0 bg-linear-to-br from-slate-900 to-slate-950 z-0"
        />
      )}

      <div className={cn(
        "w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-500 z-10 shrink-0",
        active ? "bg-primary text-slate-950 scale-105 shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
      )}>
        {icon}
      </div>
      <div className="flex-1 z-10 min-w-0">
        <h4 className={cn(
          "font-display font-bold text-[15px] md:text-heading-3 uppercase tracking-tight transition-colors mb-0.5 md:mb-1",
          active ? "text-white" : "text-slate-950"
        )}>
          {title}
        </h4>
        <p className={cn(
          "text-[10px] md:text-label font-body font-medium uppercase tracking-wide transition-colors leading-snug",
          active ? "text-slate-400" : "text-slate-400 group-hover:text-slate-500"
        )}>
          {description}
        </p>
      </div>
      {active && (
        <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center z-10 shadow-lg shrink-0">
          <CheckCircle2 size={16} className="md:size-5 text-slate-950" />
        </div>
      )}
    </button>
  );
}

function InputGroup({ label, icon, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-1.5 md:space-y-3 group">
      <label className="text-[9px] md:text-[10px] font-body font-bold text-slate-400 uppercase tracking-[0.18em] ml-1 group-focus-within:text-slate-950 transition-all duration-300 block">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-950 transition-all duration-300">
            {icon}
          </div>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full h-12 md:h-16 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl focus:bg-slate-50 focus:ring-4 md:focus:ring-8 focus:ring-slate-950/10 focus:border-slate-950/10 transition-all duration-300 font-body font-bold text-sm md:text-body-lg text-slate-950 outline-none placeholder:text-slate-300 placeholder:font-medium",
            icon ? "pl-11 md:pl-16" : "px-5 md:px-8"
          )}
        />
      </div>
    </div>
  );
}
