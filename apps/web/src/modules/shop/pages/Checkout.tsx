import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "../../../core/stores/useCartStore";
import { useSettings } from "../../../core/hooks/useSettings";
import { formatCurrency, cn } from "../../../shared/utils";
import { ChevronLeft, ChevronRight, ShoppingBag, MapPin, CreditCard, CheckCircle2, Loader2, Phone, Zap, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../core/config/api";
import toast from "react-hot-toast";

type Step = "address" | "payment" | "success";

export default function Checkout() {
  const [step, setStep] = useState<Step>("address");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreatedId, setOrderCreatedId] = useState<number | null>(null);
  const { items, getSubtotal, clearCart } = useCartStore();
  const { settings } = useSettings();
  const router = useRouter();

  const subtotal = getSubtotal();
  const deliveryFee = settings?.deliveryFee || 0;
  const total = subtotal + deliveryFee;
  const minOrderValue = settings?.minOrderValue || 0;
  const isBelowMinimum = subtotal < minOrderValue;

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    zipCode: "",
    street: "",
    number: "",
    neighborhood: "",
    complement: "",
    paymentMethod: "PIX" as "PIX" | "CARD" | "CASH"
  });

  const handleNext = () => {
    if (isBelowMinimum) {
        toast.error(`O valor mínimo para pedido é de ${formatCurrency(minOrderValue)}`);
        return;
    }
    if (step === "address") setStep("payment");
  };

  const handleBack = () => {
    if (step === "payment") setStep("address");
    else navigate("/");
  };

  const handleFinishOrder = async () => {
    if (isBelowMinimum) {
        toast.error(`O valor mínimo para pedido é de ${formatCurrency(minOrderValue)}`);
        return;
    }

    if (!formData.customerName || !formData.phone || !formData.street) {
        toast.error("Por favor, preencha as informações obrigatórias.");
        return;
    }
    
    setIsSubmitting(true);
    try {
      const orderData = {
        customerName: formData.customerName,
        phone: formData.phone,
        address: `${formData.street}, ${formData.number} - ${formData.neighborhood}`,
        paymentMethod: formData.paymentMethod,
        items: items.map((i: any) => ({ 
            id: i.productId, 
            quantity: i.quantity,
            name: i.name,
            price: i.price
        })),
        total: total,
        deliveryFee: deliveryFee
      };

      const response = await api.post("/orders", orderData);
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
        <Link href="/" className="h-14 px-8 bg-primary text-white rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-primary/30">
          VOLTAR AO CARDÁPIO
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
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
             <h1 className="font-black text-slate-900 uppercase tracking-tighter text-lg">Finalizar Pedido</h1>
             <div className="flex gap-1.5 mt-1">
                <div className={cn("w-8 h-1 rounded-full transition-colors", step === "address" ? "bg-primary" : "bg-slate-100")} />
                <div className={cn("w-8 h-1 rounded-full transition-colors", step === "payment" ? "bg-primary" : "bg-slate-100")} />
                <div className={cn("w-8 h-1 rounded-full transition-colors", step === "success" ? "bg-primary" : "bg-slate-100")} />
             </div>
          </div>

          <div className="w-12 h-12 flex items-center justify-center text-slate-300">
             <Zap size={24} fill="currentColor" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Coluna de Conteúdo */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === "address" && (
                <motion.div key="address" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <MapPin size={20} />
                     </div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Onde entregamos?</h2>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup label="Seu Nome" icon={null} value={formData.customerName} onChange={(v: string) => setFormData({...formData, customerName: v})} placeholder="Ex: João Silva" />
                        <InputGroup label="WhatsApp" icon={<Phone size={16}/>} value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="h-[1px] bg-slate-50" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <InputGroup label="Rua / Logradouro" icon={null} value={formData.street} onChange={(v: string) => setFormData({...formData, street: v})} placeholder="Nome da rua" />
                        </div>
                        <InputGroup label="Número" icon={null} value={formData.number} onChange={(v: string) => setFormData({...formData, number: v})} placeholder="123" />
                    </div>
                    <InputGroup label="Bairro" icon={null} value={formData.neighborhood} onChange={(v: string) => setFormData({...formData, neighborhood: v})} placeholder="Nome do bairro" />
                  </div>

                  <button 
                    onClick={handleNext}
                    disabled={isBelowMinimum}
                    className={cn(
                        "h-16 w-full rounded-2xl font-black flex items-center justify-center gap-3 mt-8 shadow-xl transition-all",
                        isBelowMinimum 
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                            : "bg-slate-900 text-white shadow-slate-900/10 hover:bg-black"
                    )}
                  >
                    CONTINUAR PARA PAGAMENTO <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}

              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                   <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <CreditCard size={20} />
                     </div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Escolha como pagar</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <PaymentOption 
                        active={formData.paymentMethod === 'PIX'} 
                        onClick={() => setFormData({...formData, paymentMethod: 'PIX'})}
                        title="Pagar com PIX"
                        description="Aprovação instantânea e segura"
                    />
                    <PaymentOption 
                        active={formData.paymentMethod === 'CARD'} 
                        onClick={() => setFormData({...formData, paymentMethod: 'CARD'})}
                        title="Cartão de Crédito/Débito"
                        description="Pague na entrega pela maquininha"
                    />
                    <PaymentOption 
                        active={formData.paymentMethod === 'CASH'} 
                        onClick={() => setFormData({...formData, paymentMethod: 'CASH'})}
                        title="Dinheiro"
                        description="Pague em espécie ao receber"
                    />
                  </div>

                  <button 
                    onClick={handleFinishOrder}
                    disabled={isSubmitting || isBelowMinimum}
                    className={cn(
                        "h-16 w-full rounded-2xl font-black flex items-center justify-center gap-3 mt-10 shadow-xl transition-all disabled:opacity-50",
                        isBelowMinimum
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                            : "bg-primary text-white shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                    {isSubmitting ? 'PROCESSANDO...' : 'FINALIZAR PEDIDO'}
                  </button>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-100">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Pedido Recebido!</h2>
                    <p className="text-slate-500 font-medium text-lg max-w-md mx-auto mb-10 leading-relaxed">
                        Seu pedido <span className="text-slate-900 font-black">#{orderCreatedId}</span> já foi enviado para a cozinha. 
                        Acompanhe as notificações no seu WhatsApp!
                    </p>
                    <Link href="/" className="h-16 inline-flex items-center px-10 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/10 hover:bg-black transition-all">
                        VOLTAR PARA O INÍCIO
                    </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Resumo do Pedido (Sticky lateral) */}
          {step !== "success" && (
            <div className="lg:col-span-1">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm sticky top-28">
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center justify-between">
                        Resumo <span className="text-xs bg-slate-50 px-2 py-1 rounded-lg text-slate-400">{items.length} itens</span>
                    </h3>
                    
                    <div className="space-y-4 mb-8 max-h-64 overflow-y-auto no-scrollbar pr-2">
                        {items.map((item: any, idx) => (
                            <div key={idx} className="flex justify-between items-center group">
                                <div className="flex-1 pr-4">
                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{item.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.quantity}x {formatCurrency(item.price)}</p>
                                </div>
                                <p className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3 pt-6 border-t border-slate-50">
                        <div className="flex justify-between text-sm">
                            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Subtotal</span>
                            <span className="font-black text-slate-700">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Taxa de entrega</span>
                            <span className={cn("font-black", deliveryFee > 0 ? "text-slate-700" : "text-emerald-500")}>
                                {deliveryFee > 0 ? formatCurrency(deliveryFee) : "Grátis"}
                            </span>
                        </div>
                        <div className="h-[1px] bg-slate-50 my-2" />
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a pagar</p>
                                <p className="text-3xl font-black text-primary tracking-tighter leading-none">{formatCurrency(total)}</p>
                            </div>
                        </div>
                    </div>

                    {isBelowMinimum && (
                        <div className="mt-6 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3">
                            <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">
                                Pedido Mínimo: {formatCurrency(minOrderValue)}. <br/> Faltam {formatCurrency(minOrderValue - subtotal)} para atingir o mínimo.
                            </p>
                        </div>
                    )}
                </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function InputGroup({ label, icon, value, onChange, placeholder }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative">
                {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">{icon}</div>}
                <input 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                        "w-full h-14 bg-slate-50 border-transparent rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-700 outline-none",
                        icon ? "pl-11" : "px-5"
                    )}
                />
            </div>
        </div>
    );
}

function PaymentOption({ active, onClick, title, description }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between group",
                active 
                    ? "bg-white border-primary shadow-xl shadow-primary/5" 
                    : "bg-white border-slate-50 hover:border-slate-200"
            )}
        >
            <div className="text-left">
                <p className={cn("font-black uppercase tracking-tight", active ? "text-primary" : "text-slate-900")}>{title}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{description}</p>
            </div>
            <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                active ? "border-primary bg-primary" : "border-slate-200 bg-white"
            )}>
                {active && <CheckCircle2 size={12} className="text-white" />}
            </div>
        </button>
    );
}
