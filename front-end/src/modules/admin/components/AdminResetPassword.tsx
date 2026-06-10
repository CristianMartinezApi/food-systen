"use client";

import { useState } from "react";
import { Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../../../core/config/api";
import toast from "react-hot-toast";

interface AdminResetPasswordProps {
  userId: number;
  userEmail: string;
  userName: string;
  onSuccess?: () => void;
}

export default function AdminResetPassword({
  userId,
  userEmail,
  userName,
  onSuccess,
}: AdminResetPasswordProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordRequirements, setPasswordRequirements] = useState<
    { label: string; met: boolean }[]
  >([
    { label: "Mínimo 8 caracteres", met: false },
    { label: "Pelo menos 1 letra maiúscula", met: false },
    { label: "Pelo menos 1 letra minúscula", met: false },
    { label: "Pelo menos 1 número", met: false },
    { label: "Pelo menos 1 caractere especial", met: false },
  ]);

  const validatePasswordStrength = (password: string) => {
    const requirements = [
      { label: "Mínimo 8 caracteres", met: password.length >= 8 },
      { label: "Pelo menos 1 letra maiúscula", met: /[A-Z]/.test(password) },
      { label: "Pelo menos 1 letra minúscula", met: /[a-z]/.test(password) },
      { label: "Pelo menos 1 número", met: /[0-9]/.test(password) },
      {
        label: "Pelo menos 1 caractere especial",
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      },
    ];
    setPasswordRequirements(requirements);
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    validatePasswordStrength(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não correspondem");
      return;
    }

    if (!passwordRequirements.every((req) => req.met)) {
      toast.error("A senha não atende aos requisitos de segurança");
      return;
    }

    try {
      setIsLoading(true);
      await api.post(`/admin/users/${userId}/reset-password`, {
        newPassword,
      });

      toast.success(`Senha de ${userName} resetada com sucesso!`);
      setNewPassword("");
      setConfirmPassword("");
      setIsOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao resetar senha");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold uppercase tracking-tight hover:bg-blue-100 transition-colors"
      >
        <Lock size={14} className="inline mr-1" />
        Reset Senha
      </button>
    );
  }

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 uppercase text-sm">Resetar Senha</h3>
            <p className="text-xs text-slate-500">{userEmail}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nova Senha */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
              Nova Senha
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={handleNewPasswordChange}
              placeholder="••••••••"
              className="w-full h-10 px-3 bg-slate-50 border-2 border-transparent focus:border-blue-300 rounded-lg transition-all font-medium text-sm text-slate-700 outline-none"
            />
          </div>

          {/* Confirmar Senha */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
              Confirmar Senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3 bg-slate-50 border-2 border-transparent focus:border-blue-300 rounded-lg transition-all font-medium text-sm text-slate-700 outline-none"
            />
          </div>

          {/* Requisitos */}
          {newPassword && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Requisitos
              </p>
              <ul className="space-y-1.5">
                {passwordRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={12} className="text-slate-300 flex-shrink-0" />
                    )}
                    <span className={req.met ? "text-slate-600" : "text-slate-400"}>
                      {req.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aviso */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-900 font-medium">
              ⚠️ O usuário deverá fazer login novamente após o reset.
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 bg-slate-100 text-slate-900 rounded-lg font-bold text-xs uppercase hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !allRequirementsMet}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
              Resetar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
