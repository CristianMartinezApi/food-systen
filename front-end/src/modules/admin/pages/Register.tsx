"use client";

import Link from "next/link";
import { ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";

export default function Register() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-xl shadow-2xl shadow-slate-950/30">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Acesso controlado</p>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">Cadastro público desativado</h1>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40 mb-3">Como funciona</p>
            <ul className="space-y-3 text-sm text-white/80 leading-relaxed">
              <li>• O super admin cria o usuário e libera o acesso manualmente.</li>
              <li>• O cliente aprovado entra no sistema e cria a própria loja.</li>
              <li>• Cada loja nasce com seu próprio tenant e banco dedicado.</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-slate-900 border border-white/10 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40 mb-3">Acesso interno</p>
            <p className="text-sm text-white/80 leading-relaxed mb-4">
              Se você é o responsável pela operação, acesse o painel administrativo para criar e aprovar clientes.
            </p>
            <Link href="/admin/login" className="inline-flex items-center gap-3 h-12 px-5 rounded-2xl bg-primary text-white font-black uppercase tracking-tight">
              Entrar no painel <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 text-sm text-white/60">
          <div className="flex items-center gap-2"><Mail size={16} /> Suporte via email interno</div>
          <div className="flex items-center gap-2"><Lock size={16} /> Controle total de liberação</div>
        </div>
      </div>
    </div>
  );
}
