"use client";

import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    Check,
    ChevronRight,
    CircleDollarSign,
    ClipboardCheck,
    Clock3,
    LayoutDashboard,
    Menu,
    MessageCircle,
    PackageCheck,
    ReceiptText,
    ShieldCheck,
    Store,
    Users,
    Utensils,
    WalletCards,
    X,
} from "lucide-react";
import { useState } from "react";
import { SAAS_SUPPORT_PHONE } from "../../../core/config/support";
import { sendToWhatsApp } from "../../../shared/utils/whatsapp";

const OPERATION_AREAS = [
    {
        eyebrow: "Atendimento",
        title: "Salão, balcão e delivery no mesmo fluxo",
        description: "Mesas, comandas do garçom, venda direta e pedidos do cardápio digital chegam organizados para a equipe.",
        icon: Utensils,
    },
    {
        eyebrow: "Produção",
        title: "Pedidos claros para executar sem ruído",
        description: "Acompanhe cada pedido, seu canal e seu status sem depender de anotações ou mensagens soltas.",
        icon: PackageCheck,
    },
    {
        eyebrow: "Financeiro",
        title: "Caixa seguro do início ao fechamento",
        description: "Abertura, suprimento, sangria, contagem por cédulas e fechamento cego com registro de divergências.",
        icon: CircleDollarSign,
    },
    {
        eyebrow: "Gestão",
        title: "Decisões baseadas no que aconteceu",
        description: "Relatórios diários, histórico de sessões e trilha operacional para entender cada turno da loja.",
        icon: BarChart3,
    },
];

const FEATURES = [
    {
        title: "Cardápio digital próprio",
        description: "Venda por um canal da sua marca, com categorias, variações, adicionais, entrega e retirada.",
        icon: ReceiptText,
    },
    {
        title: "Mesas e atendimento",
        description: "Organize salão, garçom e pedidos por mesa com uma visão simples para a operação.",
        icon: Users,
    },
    {
        title: "Venda direta e pedidos",
        description: "Registre vendas no balcão e acompanhe o andamento dos pedidos em uma única fila.",
        icon: WalletCards,
    },
    {
        title: "Controle de caixa",
        description: "Tenha abertura, movimentações, conferência e fechamento com responsabilidade identificada.",
        icon: ShieldCheck,
    },
    {
        title: "Relatório diário",
        description: "Consulte hoje ou dias anteriores e entenda faturamento, formas de pagamento e desempenho.",
        icon: LayoutDashboard,
    },
    {
        title: "Equipe e permissões",
        description: "Defina acessos por função e mantenha as ações importantes vinculadas a quem executou.",
        icon: ClipboardCheck,
    },
];

const PLANS = [
    {
        name: "Start",
        audience: "Para começar com controle",
        price: 99,
        products: "até 120 produtos",
        orders: "até 900 pedidos/mês",
        features: ["Núcleo operacional completo", "Cardápio e pedidos próprios", "Caixa e relatórios diários", "Suporte em horário comercial"],
    },
    {
        name: "Pro",
        audience: "Para a operação que ganhou ritmo",
        price: 179,
        products: "até 350 produtos",
        orders: "até 2.500 pedidos/mês",
        features: ["Tudo do plano Start", "Mais volume para salão e delivery", "Equipe e permissões", "Implantação acompanhada"],
        featured: true,
    },
    {
        name: "Scale",
        audience: "Para alto volume operacional",
        price: 299,
        products: "até 1.000 produtos",
        orders: "até 6.000 pedidos/mês",
        features: ["Tudo do plano Pro", "Maior capacidade de operação", "Acompanhamento prioritário", "Revisão assistida da operação"],
    },
];

const FAQ = [
    {
        question: "Preciso instalar algum programa?",
        answer: "Não. O FoodSystem funciona no navegador e pode ser acessado pelos dispositivos usados na sua operação.",
    },
    {
        question: "O FoodSystem cobra comissão por pedido?",
        answer: "Não. A mensalidade do plano não muda de acordo com o valor das suas vendas e não há comissão por pedido.",
    },
    {
        question: "Minha equipe recebe ajuda para começar?",
        answer: "Sim. A implantação é acompanhada para organizar a configuração inicial e orientar o primeiro uso da operação.",
    },
    {
        question: "Posso consultar vendas de dias anteriores?",
        answer: "Sim. O relatório diário permite selecionar outra data e revisar vendas, pagamentos e informações do caixa.",
    },
    {
        question: "Posso mudar de plano depois?",
        answer: "Sim. O plano pode acompanhar o crescimento do volume de produtos e pedidos da sua loja.",
    },
];

export default function LandingPage() {
    const [menuOpen, setMenuOpen] = useState(false);

    const requestDemo = (origin: string) => {
        sendToWhatsApp(
            SAAS_SUPPORT_PHONE,
            `Olá! Conheci o FoodSystem pela ${origin} e gostaria de agendar uma demonstração para minha operação.`
        );
    };

    return (
        <div className="min-h-screen bg-[#f6f7f8] text-slate-950 selection:bg-emerald-200">
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 lg:px-8">
                    <Link href="/" className="flex items-center gap-3" aria-label="FoodSystem - início">
                        <Image
                            src="/foodsystem-icon.svg"
                            alt=""
                            width={40}
                            height={40}
                            className="h-10 w-10"
                        />
                        <span>
                            <strong className="block text-sm leading-none">FoodSystem</strong>
                            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Operação gastronômica</span>
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 lg:flex">
                        <a href="#plataforma" className="hover:text-slate-950">Plataforma</a>
                        <a href="#recursos" className="hover:text-slate-950">Recursos</a>
                        <a href="#planos" className="hover:text-slate-950">Planos</a>
                        <a href="#faq" className="hover:text-slate-950">Dúvidas</a>
                    </nav>

                    <div className="hidden items-center gap-3 sm:flex">
                        <Link href="/login" className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-slate-950">
                            Entrar
                        </Link>
                        <button
                            type="button"
                            onClick={() => requestDemo("página inicial")}
                            className="inline-flex h-10 items-center gap-2 bg-emerald-500 px-5 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                        >
                            Agendar demonstração <ArrowRight size={16} />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMenuOpen((current) => !current)}
                        className="grid h-10 w-10 place-items-center border border-slate-200 sm:hidden"
                        aria-label="Abrir menu"
                    >
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {menuOpen && (
                    <div className="border-t border-slate-200 bg-white p-5 sm:hidden">
                        <nav className="grid gap-1 text-sm font-bold">
                            {[
                                ["Plataforma", "#plataforma"],
                                ["Recursos", "#recursos"],
                                ["Planos", "#planos"],
                                ["Dúvidas", "#faq"],
                            ].map(([label, href]) => (
                                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="border-b border-slate-100 py-3">
                                    {label}
                                </a>
                            ))}
                            <Link href="/login" className="py-3">Entrar no sistema</Link>
                        </nav>
                    </div>
                )}
            </header>

            <main>
                <section className="bg-slate-950">
                    <div className="mx-auto grid min-h-[700px] max-w-[1440px] lg:grid-cols-[0.88fr_1.12fr]">
                        <div className="flex flex-col justify-center px-5 py-20 text-white lg:px-12 xl:px-20">
                            <div className="mb-7 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">
                                <span className="h-px w-8 bg-emerald-400" />
                                Sistema para restaurantes
                            </div>
                            <h1 className="max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl xl:text-7xl">
                                Sua operação inteira, no mesmo ritmo.
                            </h1>
                            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
                                Do pedido ao fechamento do caixa, o FoodSystem conecta salão, balcão, delivery e gestão para sua equipe operar com clareza.
                            </p>

                            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => requestDemo("apresentação principal")}
                                    className="inline-flex h-14 items-center justify-center gap-3 bg-emerald-500 px-7 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                                >
                                    Ver o sistema em operação <ArrowRight size={18} />
                                </button>
                                <a href="#plataforma" className="inline-flex h-14 items-center justify-center gap-2 border border-slate-700 px-7 text-sm font-bold text-white hover:border-slate-500">
                                    Conhecer a plataforma
                                </a>
                            </div>

                            <div className="mt-11 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-800 pt-7 text-xs font-semibold text-slate-300">
                                {["Sem comissão por pedido", "Implantação acompanhada", "Acesso pelo navegador", "Suporte para sua equipe"].map((item) => (
                                    <span key={item} className="flex items-center gap-2">
                                        <Check size={15} className="shrink-0 text-emerald-400" /> {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="relative min-h-[460px] overflow-hidden border-l border-white/10 lg:min-h-full">
                            <Image
                                src="/foodsystem-operations-hero.png"
                                alt="Equipe de restaurante usando o FoodSystem no balcão, tablet e celular"
                                fill
                                priority
                                sizes="(max-width: 1024px) 100vw, 58vw"
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/35 via-transparent to-transparent" />
                            <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 border border-white/15 bg-slate-950/85 text-white backdrop-blur md:bottom-8 md:left-8 md:right-8">
                                {[
                                    ["01", "Pedidos organizados"],
                                    ["02", "Caixa conferido"],
                                    ["03", "Gestão em tempo real"],
                                ].map(([number, label]) => (
                                    <div key={number} className="border-r border-white/10 px-3 py-4 last:border-r-0 md:px-5">
                                        <span className="block text-[9px] font-black tracking-[0.2em] text-emerald-400">{number}</span>
                                        <strong className="mt-1 block text-[10px] leading-4 md:text-xs">{label}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-b border-slate-200 bg-white">
                    <div className="mx-auto grid max-w-[1440px] grid-cols-2 lg:grid-cols-4">
                        {["Salão e garçom", "Balcão e delivery", "Caixa operacional", "Relatórios diários"].map((item) => (
                            <div key={item} className="flex min-h-24 items-center justify-center border-r border-t border-slate-200 px-5 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500 lg:border-t-0">
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                <section id="plataforma" className="scroll-mt-20 py-24 lg:py-32">
                    <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
                        <div className="grid gap-8 border-b border-slate-300 pb-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Uma operação conectada</span>
                                <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                                    Menos improviso.<br />Mais controle no turno.
                                </h2>
                            </div>
                            <p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">
                                O FoodSystem foi pensado para o trabalho que acontece agora: atender, produzir, receber e conferir. Cada etapa alimenta a próxima e deixa um histórico útil para a gestão.
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-4">
                            {OPERATION_AREAS.map((area, index) => {
                                const Icon = area.icon;
                                return (
                                    <article key={area.title} className="border-b border-slate-300 py-9 lg:border-b-0 lg:border-r lg:px-7 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{area.eyebrow}</span>
                                            <span className="text-xs font-bold text-slate-300">0{index + 1}</span>
                                        </div>
                                        <Icon className="mt-10 text-slate-950" size={28} strokeWidth={1.7} />
                                        <h3 className="mt-5 text-xl font-black leading-7">{area.title}</h3>
                                        <p className="mt-3 text-sm leading-6 text-slate-600">{area.description}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="bg-white py-24 lg:py-32">
                    <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
                        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Fluxo operacional</span>
                                <h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">A informação não para no meio do caminho.</h2>
                                <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
                                    O pedido nasce no atendimento, acompanha a execução, entra na conferência financeira e vira dado de gestão.
                                </p>
                            </div>
                            <div className="border-y border-slate-200">
                                {[
                                    ["1", "Atender", "Mesa, garçom, balcão ou cardápio digital"],
                                    ["2", "Executar", "Fila de pedidos com status para a equipe"],
                                    ["3", "Receber", "Venda e movimentações vinculadas ao caixa"],
                                    ["4", "Conferir", "Fechamento e relatório diário da operação"],
                                ].map(([number, title, detail]) => (
                                    <div key={number} className="grid gap-2 border-b border-slate-200 py-6 last:border-b-0 sm:grid-cols-[56px_0.55fr_1fr] sm:items-center">
                                        <span className="text-xs font-black text-emerald-700">{number.padStart(2, "0")}</span>
                                        <strong className="text-lg">{title}</strong>
                                        <span className="text-sm leading-6 text-slate-500">{detail}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="recursos" className="scroll-mt-20 bg-slate-950 py-24 text-white lg:py-32">
                    <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
                        <div className="max-w-3xl">
                            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">Recursos que trabalham juntos</span>
                            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">O essencial para colocar a loja em operação.</h2>
                        </div>
                        <div className="mt-14 grid border-l border-t border-slate-800 md:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map((feature) => {
                                const Icon = feature.icon;
                                return (
                                    <article key={feature.title} className="min-h-64 border-b border-r border-slate-800 p-7 lg:p-9">
                                        <Icon size={27} className="text-emerald-400" strokeWidth={1.7} />
                                        <h3 className="mt-12 text-xl font-black">{feature.title}</h3>
                                        <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section id="planos" className="scroll-mt-20 py-24 lg:py-32">
                    <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
                        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Planos simples</span>
                                <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Escolha pelo ritmo da sua loja.</h2>
                            </div>
                            <p className="max-w-xl text-base leading-7 text-slate-600 lg:justify-self-end">
                                O núcleo operacional está presente desde o primeiro plano. Você escolhe a capacidade de produtos, pedidos e o nível de acompanhamento.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-4 lg:grid-cols-3">
                            {PLANS.map((plan) => (
                                <article key={plan.name} className={`relative flex flex-col border p-7 lg:p-9 ${plan.featured ? "border-emerald-500 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}>
                                    {plan.featured && (
                                        <span className="absolute right-0 top-0 bg-emerald-500 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-950">Mais escolhido</span>
                                    )}
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${plan.featured ? "text-emerald-400" : "text-emerald-700"}`}>{plan.audience}</span>
                                    <h3 className="mt-4 text-2xl font-black">{plan.name}</h3>
                                    <div className="mt-8 flex items-end gap-2 border-b border-current/10 pb-8">
                                        <span className="mb-2 text-sm font-bold">R$</span>
                                        <strong className="text-5xl font-black tracking-[-0.05em]">{plan.price}</strong>
                                        <span className={`mb-2 text-sm ${plan.featured ? "text-slate-400" : "text-slate-500"}`}>/mês</span>
                                    </div>
                                    <div className={`grid grid-cols-2 gap-3 border-b py-6 text-xs font-bold ${plan.featured ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                                        <span>{plan.products}</span>
                                        <span>{plan.orders}</span>
                                    </div>
                                    <ul className="mt-7 flex-1 space-y-4">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className={`flex gap-3 text-sm ${plan.featured ? "text-slate-300" : "text-slate-600"}`}>
                                                <Check size={17} className="shrink-0 text-emerald-500" /> {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        type="button"
                                        onClick={() => requestDemo(`seção do plano ${plan.name}`)}
                                        className={`mt-9 inline-flex h-12 items-center justify-between px-5 text-sm font-black transition ${plan.featured ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-slate-950 text-white hover:bg-slate-800"}`}
                                    >
                                        Falar sobre este plano <ChevronRight size={17} />
                                    </button>
                                </article>
                            ))}
                        </div>
                        <p className="mt-5 text-center text-xs text-slate-500">Valores mensais. Sem comissão sobre pedidos. Consulte condições de implantação e contratação.</p>
                    </div>
                </section>

                <section className="border-y border-slate-200 bg-white py-20">
                    <div className="mx-auto grid max-w-[1280px] gap-10 px-5 lg:grid-cols-[1fr_1.3fr] lg:items-center lg:px-8">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Entrada assistida</span>
                            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em]">Não entregamos apenas um login.</h2>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-3">
                            {[
                                ["01", "Diagnóstico", "Entendemos o fluxo atual da loja."],
                                ["02", "Configuração", "Organizamos a base para começar."],
                                ["03", "Operação", "Acompanhamos o primeiro uso."],
                            ].map(([number, title, text]) => (
                                <div key={number} className="border-l border-slate-300 pl-5">
                                    <span className="text-[10px] font-black text-emerald-700">{number}</span>
                                    <strong className="mt-3 block text-sm">{title}</strong>
                                    <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="scroll-mt-20 py-24 lg:py-32">
                    <div className="mx-auto grid max-w-[1100px] gap-12 px-5 lg:grid-cols-[0.65fr_1.35fr] lg:px-8">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Dúvidas frequentes</span>
                            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">Antes de começar.</h2>
                            <button type="button" onClick={() => requestDemo("seção de dúvidas")} className="mt-7 inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                                Falar com nossa equipe <MessageCircle size={17} />
                            </button>
                        </div>
                        <div className="border-t border-slate-300">
                            {FAQ.map((item) => (
                                <details key={item.question} className="group border-b border-slate-300 py-6">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-black">
                                        {item.question}
                                        <span className="text-xl font-normal text-slate-400 transition group-open:rotate-45">+</span>
                                    </summary>
                                    <p className="max-w-2xl pt-4 text-sm leading-7 text-slate-600">{item.answer}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="bg-emerald-500">
                    <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-20">
                        <div>
                            <Clock3 size={26} className="mb-6" />
                            <h2 className="max-w-3xl text-4xl font-black tracking-[-0.045em] sm:text-5xl">Veja como o FoodSystem se encaixa no turno da sua loja.</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => requestDemo("chamada final")}
                            className="inline-flex h-14 items-center justify-center gap-3 bg-slate-950 px-8 text-sm font-black text-white hover:bg-slate-800"
                        >
                            Agendar demonstração <ArrowRight size={18} />
                        </button>
                    </div>
                </section>
            </main>

            <footer className="bg-slate-950 py-10 text-white">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/foodsystem-icon.svg"
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 ring-1 ring-white/15"
                        />
                        <div>
                            <strong className="block text-sm">FoodSystem</strong>
                            <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500">foodsystem.app.br</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-5 text-xs font-semibold text-slate-400">
                        <a href="#plataforma" className="hover:text-white">Plataforma</a>
                        <a href="#recursos" className="hover:text-white">Recursos</a>
                        <a href="#planos" className="hover:text-white">Planos</a>
                        <Link href="/login" className="hover:text-white">Entrar</Link>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">© 2026 FoodSystem</p>
                </div>
            </footer>
        </div>
    );
}
