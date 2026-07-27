import { useState, useEffect } from "react";
import { 
    Users, 
    UserPlus, 
    Trash2, 
    Shield, 
    Mail, 
    Key, 
    Loader2, 
    MoreVertical,
    CheckCircle2,
    XCircle,
    UserCircle,
    BadgeCheck,
    Contact
} from "lucide-react";
import { api } from "../../../core/config/api";
import { cn } from "../../../shared/utils";
import toast from "react-hot-toast";

type TeamMember = {
    id: number;
    name: string;
    email: string;
    role: "MANAGER" | "EMPLOYEE" | "CASHIER";
    isActive: boolean;
    createdAt: string;
};

export default function TeamSettings() {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    
    // Form states
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState<"MANAGER" | "EMPLOYEE" | "CASHIER">("EMPLOYEE");

    const loadTeam = async () => {
        try {
            setIsLoading(true);
            const response = await api.get("/team");
            setTeam(response);
        } catch (error) {
            console.error("Erro ao carregar equipe:", error);
            toast.error("Não foi possível carregar a equipe.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTeam();
    }, []);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post("/team", {
                name: newName,
                email: newEmail,
                password: newPassword,
                role: newRole
            });
            toast.success("Membro adicionado com sucesso!");
            setShowAddModal(false);
            resetForm();
            loadTeam();
        } catch (error: any) {
            toast.error(error?.message || "Erro ao adicionar membro.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleStatus = async (member: TeamMember) => {
        try {
            await api.patch(`/team/${member.id}`, {
                isActive: !member.isActive
            });
            toast.success("Status atualizado!");
            loadTeam();
        } catch (error: any) {
            toast.error(error?.message || "Erro ao atualizar status.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja remover este membro definitivamente?")) return;
        try {
            await api.delete(`/team/${id}`);
            toast.success("Membro removido.");
            loadTeam();
        } catch (error: any) {
            toast.error(error?.message || "Erro ao remover membro.");
        }
    };

    const resetForm = () => {
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        setNewRole("EMPLOYEE");
    };

    return (
        <section className="settings-panel settings-panel--security bg-white rounded-2xl sm:rounded-[3rem] border border-slate-50 p-4 sm:p-6 md:p-10 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Gestão de Equipe</h2>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">Controle quem acessa o seu PDV e Painel</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="h-12 px-6 bg-slate-950 text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                    <UserPlus size={18} />
                    ADICIONAR MEMBRO
                </button>
            </div>

            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                    <Loader2 className="animate-spin mb-4" size={40} />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Sincronizando equipe...</span>
                </div>
            ) : team.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-50 rounded-2rem">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Contact className="text-slate-200" size={32} />
                    </div>
                    <p className="text-slate-400 font-medium italic">Sua equipe está vazia. Comece adicionando o primeiro membro.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {team.map((member) => (
                        <div 
                            key={member.id} 
                            className={cn(
                                "p-6 rounded-2rem border-2 transition-all flex flex-col justify-between group",
                                member.isActive ? "border-slate-50 bg-white" : "border-slate-100 bg-slate-50/50 grayscale"
                            )}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm border border-white",
                                        member.role === 'MANAGER' ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600"
                                    )}>
                                        {member.role === 'MANAGER' ? 'G' : member.role === 'CASHIER' ? 'C' : 'GA'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-slate-900 uppercase tracking-tight leading-none">{member.name}</h3>
                                            {(member.role === 'MANAGER' || member.role === 'CASHIER') && <BadgeCheck size={14} className={cn(member.role === 'CASHIER' ? "text-emerald-500" : "text-amber-500")} />}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">{member.email}</span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                    member.role === 'MANAGER' ? "bg-amber-100 text-amber-600" : 
                                    member.role === 'CASHIER' ? "bg-emerald-100 text-emerald-600" : 
                                    "bg-sky-100 text-sky-600"
                                )}>
                                    {member.role === 'MANAGER' ? 'Gerente' : member.role === 'CASHIER' ? 'Caixa' : 'Garçom'}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <button
                                    onClick={() => toggleStatus(member)}
                                    className={cn(
                                        "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                                        member.isActive ? "text-emerald-500 hover:text-rose-500" : "text-slate-400 hover:text-emerald-500"
                                    )}
                                >
                                    {member.isActive ? (
                                        <><CheckCircle2 size={14} /> Ativo</>
                                    ) : (
                                        <><XCircle size={14} /> Inativo</>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleDelete(member.id)}
                                    className="p-2 text-slate-300 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-50"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Adição (Simples/Moderno) */}
            {showAddModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                        onClick={() => setShowAddModal(false)}
                    />
                    <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-950">Novo colaborador</h3>
                                <p className="mt-1 text-sm text-slate-500">Preencha os dados de acesso.</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddMember} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                <div className="relative">
                                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input 
                                        type="text" 
                                        required
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 transition-all" 
                                        placeholder="Ex: Pedro Silva"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Login</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input 
                                        type="email" 
                                        required
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 transition-all" 
                                        placeholder="pedro@sua-loja.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input 
                                            type="password" 
                                            required
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 transition-all" 
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Função</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <select 
                                            value={newRole}
                                            onChange={e => setNewRole(e.target.value as any)}
                                            className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 transition-all appearance-none"
                                        >
                                            <option value="EMPLOYEE">Garçom / Operacional</option>
                                            <option value="CASHIER">Operador de Caixa</option>
                                            <option value="MANAGER">Gerente Administrativo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex h-10 flex-2 items-center justify-center rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : "CRIAR ACESSO AGORA"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
