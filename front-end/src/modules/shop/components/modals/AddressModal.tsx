"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Search, Loader2 } from "lucide-react";
import { useLocationStore } from "../../../../core/stores/useLocationStore";
import { cn } from "../../../../shared/utils";
import toast from "react-hot-toast";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddressModal({ isOpen, onClose }: AddressModalProps) {
  const { address, setAddress } = useLocationStore();
  const [isSearching, setIsSearching] = useState(false);
  const [cep, setCep] = useState("");
  const [formData, setFormData] = useState({
    street: address?.street || "",
    number: address?.number || "",
    neighborhood: address?.neighborhood || "",
    city: address?.city || "",
    complement: address?.complement || "",
  });

  const handleCepFocus = () => {
    // Optional logic
  };

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsSearching(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await resp.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setFormData({
        ...formData,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
      });
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = () => {
    if (!formData.street || !formData.number || !formData.neighborhood || !formData.city) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setAddress({
      zipCode: cep,
      ...formData
    });
    toast.success("Endereço salvo!");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-150 flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-slate-100 w-full max-w-none md:max-w-lg h-dvh md:h-auto rounded-none md:rounded-[2.5rem] overflow-hidden shadow-[0_30px_70px_rgba(15,23,42,0.2)] relative z-10 p-5 md:p-10 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6 md:mb-8 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 md:w-12 md:h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                  <MapPin size={20} className="md:size-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter truncate">Endereço de Entrega</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Onde você está agora?</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 border border-slate-200 transition-all shrink-0"
              >
                <X size={18} className="md:size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pr-1 md:pr-0 space-y-5 md:space-y-6">
              <div className="relative group">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">CEP</label>
                <div className="relative mt-2">
                  <input
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    className="w-full h-12 md:h-14 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 transition-all font-bold text-slate-700 outline-none px-5 md:px-6"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="animate-spin text-primary" size={18} />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                <div className="md:col-span-3">
                  <InputLabel label="Rua / Avenida" value={formData.street} onChange={(v) => setFormData({ ...formData, street: v })} placeholder="Ex: Av. Paulista" />
                </div>
                <div className="md:col-span-1">
                  <InputLabel label="Nº" value={formData.number} onChange={(v) => setFormData({ ...formData, number: v })} placeholder="123" />
                </div>
              </div>

              <InputLabel label="Bairro" value={formData.neighborhood} onChange={(v) => setFormData({ ...formData, neighborhood: v })} placeholder="Ex: Centro" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputLabel label="Cidade" value={formData.city} onChange={(v) => setFormData({ ...formData, city: v })} placeholder="Ex: São Paulo" />
                <InputLabel label="Complemento (Opcional)" value={formData.complement} onChange={(v) => setFormData({ ...formData, complement: v })} placeholder="Ex: Apto 123" />
              </div>

              <button
                onClick={handleSave}
                className="h-14 md:h-16 w-full bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 mt-2 md:mt-4 shadow-xl shadow-slate-900/10 hover:bg-black transition-all uppercase tracking-widest text-[10px] md:text-sm shrink-0"
              >
                SALVAR ENDEREÇO
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InputLabel({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 transition-all font-bold text-slate-700 outline-none px-6"
      />
    </div>
  );
}
