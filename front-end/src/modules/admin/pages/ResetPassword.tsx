"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "../../../core/config/api";
import toast from "react-hot-toast";
import { gsap } from "gsap";

interface Step {
  type: "forgot" | "reset" | "success";
}

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [step, setStep] = useState<"forgot" | "reset" | "success">("forgot");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });
  const [passwordRequirements, setPasswordRequirements] = useState<{ label: string; met: boolean }[]>([
    { label: "Mínimo 8 caracteres", met: false },
    { label: "Pelo menos 1 letra maiúscula", met: false },
    { label: "Pelo menos 1 letra minúscula", met: false },
    { label: "Pelo menos 1 número", met: false },
    { label: "Pelo menos 1 caractere especial", met: false },
  ]);
  
  const rootRef = useRef<HTMLDivElement>(null);

  // Animar página ao carregar
  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from(".reset-card", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" });
    }, rootRef);

    return () => ctx.revert();
  }, [step]);

  // Se tem token na URL, pula para reset
  useEffect(() => {
    if (token) {
      setStep("reset");
    }
  }, [token]);

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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Por favor, insira seu email");
      return;
    }

    try {
      setIsLoading(true);
      await api.post("/auth/forgot-password", { email });
      
      toast.success("Se o email existir em nosso sistema, você receberá um link de reset");
      setEmail("");
      
      // Após 2 segundos, volta para login
      setTimeout(() => {
        router.push("/admin/login");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao solicitar reset de senha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não correspondem");
      return;
    }

    if (!passwordRequirements.every((req) => req.met)) {
      toast.error("A senha não atende aos requisitos de segurança");
      return;
    }

    try {
      setIsLoading(true);
      await api.post("/auth/reset-password", {
        token,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });

      toast.success("Senha resetada com sucesso!");
      setStep("success");

      setTimeout(() => {
        router.push("/admin/login");
      }, 3000);
    } catch (error: any) {
      if (error.status === 404 || error.status === 400) {
        toast.error(error.message || "Link inválido ou expirado. Solicite um novo reset.");
        setTimeout(() => {
          router.push("/admin/login");
        }, 2000);
      } else {
        toast.error(error.message || "Erro ao resetar senha");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="reset-card w-full max-w-md">
        {step === "forgot" && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Mail size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">
                Recuperar Acesso
              </h1>
              <p className="text-slate-500">Insira seu email para receber um link de reset de senha</p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Seu Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-medium text-slate-700 outline-none"
                />
              </div>

              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-900 font-medium">
                  ℹ️ Você receberá um email com um link seguro válido por 1 hora.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-tight hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                Enviar Link de Reset
              </button>

              <button
                type="button"
                onClick={() => router.push("/admin/login")}
                className="w-full h-12 bg-slate-100 text-slate-900 rounded-2xl font-black uppercase tracking-tight hover:bg-slate-200 transition-all"
              >
                Voltar para Login
              </button>
            </form>
          </div>
        )}

        {step === "reset" && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">
                Criar Nova Senha
              </h1>
              <p className="text-slate-500">Digite uma senha forte para recuperar seu acesso</p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
              {/* Nova Senha */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }));
                      validatePasswordStrength(e.target.value);
                    }}
                    placeholder="••••••••"
                    className="w-full h-12 pl-5 pr-14 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-xl transition-all font-medium text-slate-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? "👁" : "👁‍🗨"}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full h-12 pl-5 pr-14 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-xl transition-all font-medium text-slate-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? "👁" : "👁‍🗨"}
                  </button>
                </div>
              </div>

              {/* Requisitos de Senha */}
              {passwordData.newPassword && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Requisitos de Segurança
                  </p>
                  <ul className="space-y-2">
                    {passwordRequirements.map((req, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        {req.met ? (
                          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle size={16} className="text-slate-300 flex-shrink-0" />
                        )}
                        <span className={req.met ? "text-slate-600" : "text-slate-400"}>
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !passwordRequirements.every((req) => req.met)}
                className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-tight hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />}
                Resetar Senha
              </button>
            </form>
          </div>
        )}

        {step === "success" && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 text-center">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">
              Sucesso!
            </h1>
            <p className="text-slate-500 mb-6">Sua senha foi resetada com sucesso. Você será redirecionado para o login.</p>
            <button
              onClick={() => router.push("/admin/login")}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-tight hover:bg-black transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight size={20} />
              Ir para Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
