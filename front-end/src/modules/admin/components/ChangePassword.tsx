"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../../../core/config/api";
import toast from "react-hot-toast";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirement[]>([
    { label: "Mínimo 8 caracteres", met: false },
    { label: "Pelo menos 1 letra maiúscula", met: false },
    { label: "Pelo menos 1 letra minúscula", met: false },
    { label: "Pelo menos 1 número", met: false },
    { label: "Pelo menos 1 caractere especial", met: false },
  ]);

  // Validar força da senha em tempo real
  const validatePasswordStrength = (password: string) => {
    const requirements = [
      { label: "Mínimo 8 caracteres", met: password.length >= 8 },
      { label: "Pelo menos 1 letra maiúscula", met: /[A-Z]/.test(password) },
      { label: "Pelo menos 1 letra minúscula", met: /[a-z]/.test(password) },
      { label: "Pelo menos 1 número", met: /[0-9]/.test(password) },
      { label: "Pelo menos 1 caractere especial", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    ];
    setPasswordRequirements(requirements);
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, newPassword: value }));
    validatePasswordStrength(value);
  };

  const handleTogglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("As novas senhas não correspondem");
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error("A nova senha deve ser diferente da atual");
      return;
    }

    if (!passwordRequirements.every((req) => req.met)) {
      toast.error("A senha não atende aos requisitos de segurança");
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await api.post("/users/me/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      toast.success("Senha alterada com sucesso!");
      
      // Limpar formulário
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      setShowForm(false);
      
      // Log out e redireciona para login por segurança
      setTimeout(() => {
        localStorage.removeItem("@FoodSystem:token");
        localStorage.removeItem("@FoodSystem:user");
        localStorage.removeItem("@FoodSystem:restaurant");
        window.location.href = "/admin/login";
      }, 1500);
    } catch (error: any) {
      // Trata erros específicos
      if (error.status === 429) {
        toast.error("Muitas tentativas. Tente novamente em 15 minutos.");
      } else if (error.status === 401) {
        toast.error("Senha atual inválida");
      } else {
        toast.error(error.message || "Erro ao alterar senha");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="rounded-3xl bg-linear-to-br from-slate-50 to-slate-100 border border-slate-200 p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">Segurança da Conta</h3>
              <p className="text-sm text-slate-500">Gerencie sua senha de acesso</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="w-full h-12 bg-slate-900 text-white rounded-xl font-black uppercase tracking-tight hover:bg-black transition-all flex items-center justify-center gap-2"
        >
          <Lock size={18} />
          Alterar Senha
        </button>
      </div>
    );
  }

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">Alterar Senha</h3>
          <p className="text-sm text-slate-500">Crie uma nova senha para sua conta</p>
        </div>
        <button
          onClick={() => setShowForm(false)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Senha Atual */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Senha Atual
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? "text" : "password"}
              value={formData.currentPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="••••••••"
              className="w-full h-12 pl-5 pr-14 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-xl transition-all font-medium text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={() => handleTogglePasswordVisibility("current")}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Nova Senha */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Nova Senha
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? "text" : "password"}
              value={formData.newPassword}
              onChange={handleNewPasswordChange}
              placeholder="••••••••"
              className="w-full h-12 pl-5 pr-14 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-xl transition-all font-medium text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={() => handleTogglePasswordVisibility("new")}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Confirmar Nova Senha */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Confirmar Nova Senha
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="••••••••"
              className="w-full h-12 pl-5 pr-14 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-xl transition-all font-medium text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={() => handleTogglePasswordVisibility("confirm")}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Requisitos de Senha */}
        {formData.newPassword && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Requisitos de Segurança
            </p>
            <ul className="space-y-2">
              {passwordRequirements.map((req, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  {req.met ? (
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-slate-300 shrink-0" />
                  )}
                  <span className={req.met ? "text-slate-600" : "text-slate-400"}>
                    {req.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Aviso de Segurança */}
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-900 font-medium">
            ℹ️ Por segurança, você será desconectado após alterar a senha e precisará fazer login novamente.
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 h-12 bg-slate-100 text-slate-900 rounded-xl font-black uppercase tracking-tight hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || !allRequirementsMet || formData.currentPassword !== formData.currentPassword}
            className="flex-1 h-12 bg-primary text-white rounded-xl font-black uppercase tracking-tight hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
            Alterar Senha
          </button>
        </div>
      </form>
    </div>
  );
}
