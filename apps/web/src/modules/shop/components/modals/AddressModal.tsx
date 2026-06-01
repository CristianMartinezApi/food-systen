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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
            className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 p-8 md:p-10"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <MapPin size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Endereço de Entrega</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Onde você está agora?</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">CEP</label>
                <div className="relative">
                  <input 
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    className="w-full h-14 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-bold text-slate-700 outline-none px-6"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="animate-spin text-primary" size={20} />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                  <InputLabel label="Rua / Avenida" value={formData.street} onChange={(v) => setFormData({...formData, street: v})} placeholder="Ex: Av. Paulista" />
                </div>
                <div className="md:col-span-1">
                  <InputLabel label="Nº" value={formData.number} onChange={(v) => setFormData({...formData, number: v})} placeholder="123" />
                </div>
              </div>

              <InputLabel label="Bairro" value={formData.neighborhood} onChange={(v) => setFormData({...formData, neighborhood: v})} placeholder="Ex: Centro" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputLabel label="Cidade" value={formData.city} onChange={(v) => setFormData({...formData, city: v})} placeholder="Ex: São Paulo" />
                <InputLabel label="Complemento (Opcional)" value={formData.complement} onChange={(v) => setFormData({...formData, complement: v})} placeholder="Ex: Apto 123" />
              </div>

              <button 
                onClick={handleSave}
                className="h-16 w-full bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 mt-4 shadow-xl shadow-slate-900/10 hover:bg-black transition-all uppercase tracking-widest text-sm"
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
        className="w-full h-14 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-bold text-slate-700 outline-none px-6"
      />
    </div>
  );
}
