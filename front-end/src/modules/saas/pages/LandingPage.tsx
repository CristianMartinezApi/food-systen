"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, LayoutDashboard, MessageSquare, ReceiptText, ShieldCheck, Store, Users, Utensils, Zap } from "lucide-react";
import { useSettings } from "../../../core/hooks/useSettings";
import { sendToWhatsApp } from "../../../shared/utils/whatsapp";

const PRODUCT_SURFACES = [
    {
        title: "Cardápio digital",
        description: "Categorias, produtos, variações, tamanhos, adicionais e preços organizados para publicar a loja.",
        icon: ReceiptText,
    },
    {
        title: "Pedidos e checkout",
        description: "Fluxo de compra do cliente com entrega, retirada, formas de pagamento e acompanhamento do pedido.",
        icon: Store,
    },
    {
        title: "Caixa operacional",
        description: "Abertura, fechamento, sangria, suprimento e conferência de divergência no fechamento.",
        icon: Clock3,
    },
    {
        title: "Painel administrativo",
        description: "Clientes, lojas, onboarding, auditoria e provisioning para manter a operação organizada.",
        icon: LayoutDashboard,
    },
];

const WHO_IT_IS_FOR = [
    "Pizzarias",
    "Hamburguerias",
    "Restaurantes de bairro",
    "Dark kitchens",
    "Marmitarias",
    "Lanchonetes",
];

const HOW_IT_WORKS = [
    {
        step: "01",
        title: "Entendemos a operação",
        description: "Falamos com o responsável, ajustamos o cenário da loja e organizamos a entrada com clareza.",
    },
    {
        step: "02",
        title: "Configuramos a loja",
        description: "Cardápio, preço, entrega, pagamentos e apresentação da marca ficam prontos para uso.",
    },
    {
        step: "03",
        title: "A equipe começa a operar",
        description: "O time passa a receber pedidos, acompanhar vendas e executar o dia a dia com mais previsibilidade.",
    },
];

const OPERATIONAL_PROMISES = [
    "Canal próprio de venda",
    "Fluxo de pedidos mais organizado",
    "Configuração orientada por suporte",
    "Foco em operação real, não em promessa vaga",
];

const FAQ = [
    {
        question: "Isso é para restaurante que está começando?",
        answer: "Sim. A proposta é justamente ajudar restaurantes em fase inicial ou em crescimento a ter um canal digital organizado desde o começo.",
    },
    {
        question: "Vocês fazem implantação ou eu preciso configurar tudo sozinho?",
        answer: "A entrada é guiada. A ideia é apoiar a configuração para que a loja comece com menos atrito e mais segurança.",
    },
    {
        question: "Preciso ter equipe técnica?",
        answer: "Não. A operação é pensada para o uso comercial e operacional, não para exigir conhecimento técnico da sua equipe.",
    },
    {
        question: "Como a empresa se posiciona se ainda está entrando no mercado?",
        answer: "Com seriedade, transparência e suporte próximo. É melhor prometer o que conseguimos entregar do que inflar números sem base real.",
    },
];

export default function LandingPage() {
    const { settings } = useSettings();
    const contactPhone = settings?.phone || settings?.contact?.phones?.[0] || settings?.contact?.social?.whatsapp || "";

    const bannerBadge = settings?.bannerBadge ?? "Sistema comercial e operacional para restaurantes";
    const bannerTitle = settings?.bannerTitleLine1 || settings?.bannerTitleLine2
        ? `${settings?.bannerTitleLine1 ?? ""}${settings?.bannerTitleLine2 ? ` ${settings.bannerTitleLine2}` : ""}`.trim()
        : "Tudo o que seu restaurante precisa para vender direto e operar com controle.";
    const bannerDescription = settings?.bannerDescription ?? "Cardápio digital, checkout, pedidos, caixa e painel administrativo em uma plataforma construída para a rotina do restaurante. Sem exagero, sem promessa vazia e com foco em operação real.";
    const bannerCta = settings?.bannerCtaLabel ?? "Solicitar acesso";
    const bannerImage = settings?.bannerImage ?? "/hero-illustration.png";

    const openLeadWhatsApp = () => {
        if (!contactPhone) return;

        sendToWhatsApp(
            contactPhone,
            "Olá! Quero entender como o FoodSystem pode ajudar minha loja a operar melhor e vender direto."
        );
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-primary selection:text-white">
            <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-primary shadow-lg shadow-slate-950/15">
                            <Utensils size={22} />
                        </div>
                        <div className="leading-tight">
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">FoodSystem</p>
                            <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-950">Para restaurantes</p>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-8 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:flex">
                        <a href="#solucao" className="transition-colors hover:text-primary">Solução</a>
                        <a href="#para-quem" className="transition-colors hover:text-primary">Para quem</a>
                        <a href="#processo" className="transition-colors hover:text-primary">Como funciona</a>
                        <a href="#acesso" className="transition-colors hover:text-primary">Acesso</a>
                        <a href="#faq" className="transition-colors hover:text-primary">FAQ</a>
                    </nav>

                    <div className="flex items-center gap-3">
                        {contactPhone ? (
                            <button
                                type="button"
                                onClick={openLeadWhatsApp}
                                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-black"
                            >
                                Solicitar acesso <ArrowRight size={14} />
                            </button>
                        ) : (
                            <Link href="#faq" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-black">
                                Solicitar acesso <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1">
                <section className="relative overflow-hidden border-b border-slate-100 bg-linear-to-br from-white via-slate-50 to-slate-100 py-16 md:py-24">
                    <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 shadow-sm">
                                <ShieldCheck size={12} className="text-emerald-600" /> {bannerBadge}
                            </div>

                            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[0.94] tracking-tighter text-slate-950 md:text-6xl lg:text-7xl">
                                {bannerTitle}
                            </h1>

                            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                                {bannerDescription}
                            </p>

                            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                <button type="button" onClick={openLeadWhatsApp} className="inline-flex h-14 items-center justify-center gap-3 rounded-3xl bg-primary px-8 text-sm font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-primary/20 transition-transform hover:scale-[1.02]">
                                    {bannerCta} <Zap size={18} />
                                </button>
                                <Link href="#solucao" className="inline-flex h-14 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 text-sm font-black uppercase tracking-[0.16em] text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50">
                                    Ver o que entregamos
                                    <MessageSquare size={18} />
                                </Link>
                            </div>

                            <div className="mt-10 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Compromisso</p>
                                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                                        Apoiar restaurantes com implantação guiada, suporte próximo e foco no que a operação realmente usa no dia a dia.
                                    </p>
                                </div>
                                <div className="rounded-3xl border border-slate-950 bg-slate-950 p-5 text-white shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">O que já existe</p>
                                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">
                                        Cardápio digital, checkout, pedidos, caixa operacional, painel administrativo e fluxo de apoio para a loja.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
                            <div className="rounded-4xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/60 md:p-7">
                                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                                    <img src={bannerImage} alt="Apresentação do sistema" className="h-72 w-full rounded-[1.2rem] object-cover" />
                                </div>

                                <div className="mt-6 grid gap-3">
                                    {OPERATIONAL_PROMISES.map((item) => (
                                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                            <CheckCircle2 size={16} className="text-emerald-600" />
                                            <span className="text-sm font-semibold text-slate-700">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="solucao" className="border-b border-slate-100 py-20 md:py-28">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="max-w-3xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Solução</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter text-slate-950 md:text-5xl">
                                O que entregamos para o restaurante operar com mais ordem e menos improviso.
                            </h2>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-3">
                            {PRODUCT_SURFACES.map((item) => (
                                <article key={item.title} className="rounded-4xl border border-slate-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-lg">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-primary">
                                        <item.icon size={20} />
                                    </div>
                                    <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="para-quem" className="border-b border-slate-100 bg-slate-50 py-20 md:py-28">
                    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Para quem é</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter text-slate-950 md:text-5xl">
                                Feito para quem quer profissionalizar a venda sem perder o controle da operação.
                            </h2>
                            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                                A plataforma foi pensada para negócios de alimentação que precisam vender com mais organização e manter relacionamento direto com o cliente.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {WHO_IT_IS_FOR.map((item) => (
                                <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-primary">
                                            <Store size={18} />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-900">{item}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="processo" className="border-b border-slate-100 py-20 md:py-28">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="max-w-3xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Como funciona</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter text-slate-950 md:text-5xl">
                                A entrada é simples: organizar a loja, publicar o cardápio e começar a operar.
                            </h2>
                        </div>

                        <div className="mt-12 grid gap-6 lg:grid-cols-3">
                            {HOW_IT_WORKS.map((item) => (
                                <article key={item.step} className="rounded-4xl border border-slate-100 bg-white p-7 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Etapa {item.step}</p>
                                    <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="acesso" className="border-b border-slate-100 bg-slate-950 py-20 text-white md:py-28">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="max-w-3xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Acesso</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter md:text-5xl">
                                Neste momento, a oferta mais correta é acesso guiado, configuração assistida e conversa direta com a equipe.
                            </h2>
                            <p className="mt-5 text-base leading-relaxed text-slate-300">
                                Como a empresa está entrando agora, a comunicação precisa ser séria: mostrar o que já existe, como funciona e como o restaurante entra com apoio.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 lg:grid-cols-3">
                            {[
                                {
                                    name: "Configuração guiada",
                                    detail: "Ajuda para publicar loja, ajustar cardápio e deixar a operação pronta.",
                                },
                                {
                                    name: "Canal próprio",
                                    detail: "Venda direta com cardápio, checkout e fluxo da loja sob controle.",
                                },
                                {
                                    name: "Atendimento próximo",
                                    detail: "Contato humano e acompanhamento para sair do papel com segurança.",
                                },
                            ].map((plan) => (
                                <article key={plan.name} className="rounded-4xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
                                        <Clock3 size={20} />
                                    </div>
                                    <h3 className="mt-5 text-xl font-black tracking-tight text-white">{plan.name}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{plan.detail}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="border-b border-slate-100 py-20 md:py-28">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="max-w-3xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">FAQ</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter text-slate-950 md:text-5xl">
                                Respostas diretas para perguntas que um restaurante sério faz antes de começar.
                            </h2>
                        </div>

                        <div className="mt-12 grid gap-4 lg:grid-cols-2">
                            {FAQ.map((item) => (
                                <article key={item.question} className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-6">
                                    <h3 className="text-base font-black tracking-tight text-slate-950">{item.question}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20 md:py-28">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="rounded-[2.25rem] border border-slate-100 bg-linear-to-br from-slate-950 to-slate-900 p-8 text-white md:p-12">
                            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Próximo passo</p>
                                    <h2 className="mt-4 text-3xl font-black tracking-tighter md:text-5xl">
                                        Se faz sentido para o seu restaurante, vamos conversar de forma objetiva.
                                    </h2>
                                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
                                        A entrada é pensada para quem quer ser atendido com seriedade, sem discurso genérico e com foco em implantação real.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
                                    <button
                                        type="button"
                                        onClick={openLeadWhatsApp}
                                        className="inline-flex h-14 items-center justify-center gap-3 rounded-3xl bg-white px-8 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition-colors hover:bg-slate-100"
                                    >
                                        Solicitar acesso <ArrowRight size={18} />
                                    </button>
                                    <Link href="#faq" className="inline-flex h-14 items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-8 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/10">
                                        Ver dúvidas
                                        <Users size={18} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-100 bg-white py-10">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        © 2026 FOODSYSTEM.SAAS - TODOS OS DIREITOS RESERVADOS.
                    </p>
                    <div className="flex flex-wrap gap-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        <a href="#solucao" className="transition-colors hover:text-primary">Solução</a>
                        <a href="#para-quem" className="transition-colors hover:text-primary">Para quem</a>
                        <a href="#acesso" className="transition-colors hover:text-primary">Acesso</a>
                        <a href="#faq" className="transition-colors hover:text-primary">FAQ</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
