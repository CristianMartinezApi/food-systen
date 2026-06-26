"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, LayoutDashboard, MessageSquare, ReceiptText, ShieldCheck, Store, Users, Utensils, Zap } from "lucide-react";
import { useSettings } from "../../../core/hooks/useSettings";
import { SAAS_SUPPORT_PHONE } from "../../../core/config/support";
import { sendToWhatsApp } from "../../../shared/utils/whatsapp";

const PRODUCT_SURFACES = [
    {
        title: "Cardápio digital",
        description: "Monte categorias, produtos, variações, tamanhos e adicionais e publique sua loja em poucos minutos.",
        icon: ReceiptText,
    },
    {
        title: "Pedidos e checkout",
        description: "Entrega, retirada, formas de pagamento e acompanhamento do pedido em um fluxo de compra simples para o cliente.",
        icon: Store,
    },
    {
        title: "Caixa operacional",
        description: "Abertura, fechamento, sangria, suprimento e conferência automática de divergência — sem planilha paralela.",
        icon: Clock3,
    },
    {
        title: "Painel da sua loja",
        description: "Pedidos, produtos, clientes e vendas em um só painel, para você acompanhar a operação do dia a dia sem complicação.",
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
        description: "Conversamos com o responsável pela loja, entendemos o cenário e organizamos a entrada com clareza.",
    },
    {
        step: "02",
        title: "Configuramos a loja",
        description: "Cardápio, preços, entrega, pagamentos e identidade visual ficam prontos para uso, com acompanhamento da nossa equipe.",
    },
    {
        step: "03",
        title: "A equipe começa a operar",
        description: "O time passa a receber pedidos, acompanhar vendas e executar o dia a dia com mais previsibilidade.",
    },
];

const OPERATIONAL_PROMISES = [
    "Canal próprio de venda",
    "Fluxo de pedidos organizado de ponta a ponta",
    "Implantação acompanhada pela nossa equipe",
    "Suporte direto para o dia a dia da loja",
];

const PRICING_PLANS = [
    {
        name: "Start",
        subtitle: "Para operação em crescimento",
        price: 89,
        maxProducts: 120,
        maxOrders: 900,
        avgDailyOrders: 30,
        highlight: false,
    },
    {
        name: "Pro",
        subtitle: "Para loja com volume forte",
        price: 179,
        maxProducts: 350,
        maxOrders: 2500,
        avgDailyOrders: 83,
        highlight: true,
    },
    {
        name: "Scale",
        subtitle: "Para operação em escala",
        price: 349,
        maxProducts: 1000,
        maxOrders: 6000,
        avgDailyOrders: 200,
        highlight: false,
    },
];

const FAQ = [
    {
        question: "Isso é para restaurante que está começando?",
        answer: "Sim. A plataforma ajuda restaurantes em fase inicial ou em crescimento a terem um canal digital organizado desde o começo.",
    },
    {
        question: "Vocês fazem a implantação ou eu preciso configurar tudo sozinho?",
        answer: "A entrada é guiada pela nossa equipe: ajudamos a publicar o cardápio, configurar entrega e pagamentos para a loja começar com menos atrito.",
    },
    {
        question: "Preciso ter equipe técnica?",
        answer: "Não. O sistema foi pensado para uso comercial e operacional do dia a dia, sem exigir conhecimento técnico da sua equipe.",
    },
    {
        question: "Tenho suporte depois que a loja já está rodando?",
        answer: "Sim. O suporte continua disponível após a implantação para resolver dúvidas e ajustes da operação no dia a dia.",
    },
    {
        question: "Como funciona a cobrança dos planos?",
        answer: "A assinatura é mensal, sem contrato de fidelidade, e você pode mudar de plano conforme o volume de pedidos da sua loja cresce.",
    },
    {
        question: "Os valores dos planos têm taxa extra sobre os pedidos?",
        answer: "Não. O valor da assinatura é fixo conforme o plano escolhido, sem comissão por pedido vendido.",
    },
];

export default function LandingPage() {
    const { settings } = useSettings();
    const contactPhone = SAAS_SUPPORT_PHONE;

    const bannerBadge = settings?.bannerBadge ?? "Sistema comercial e operacional para restaurantes";
    const bannerTitle = settings?.bannerTitleLine1 || settings?.bannerTitleLine2
        ? `${settings?.bannerTitleLine1 ?? ""}${settings?.bannerTitleLine2 ? ` ${settings.bannerTitleLine2}` : ""}`.trim()
        : "Tudo o que seu restaurante precisa para vender direto e operar com controle.";
    const bannerDescription = settings?.bannerDescription ?? "Cardápio digital, checkout, pedidos, caixa e painel de gestão da loja em uma única plataforma, pensada para a rotina real do restaurante — com implantação acompanhada pela nossa equipe.";
    const bannerCta = settings?.bannerCtaLabel ?? "Solicitar acesso";
    const bannerImage = "/hero-mockup.png";

    const openLeadWhatsApp = () => {
        sendToWhatsApp(
            SAAS_SUPPORT_PHONE,
            "Olá! Vi o sistema FoodSystem e gostaria de saber mais sobre como posso utilizá-lo no meu restaurante."
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
                        <a href="#planos" className="transition-colors hover:text-primary">Planos</a>
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
                                        Implantação guiada e suporte próximo, com foco no que a sua operação realmente usa no dia a dia.
                                    </p>
                                </div>
                                <div className="rounded-3xl border border-slate-950 bg-slate-950 p-5 text-white shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">O que você recebe</p>
                                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">
                                        Cardápio digital, checkout, pedidos, caixa operacional e painel de gestão da loja, tudo integrado.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
                            <div className="rounded-4xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/60 md:p-7">
                                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-2">
                                    <img src={bannerImage} alt="Apresentação do sistema" className="w-full rounded-[1.2rem] shadow-sm" />
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
                            <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-600">Solução</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter text-slate-950 md:text-5xl">
                                O que entregamos para o seu restaurante operar com mais ordem e previsibilidade no dia a dia.
                            </h2>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-3">
                            {PRODUCT_SURFACES.map((item) => (
                                <article key={item.title} className="rounded-4xl border border-slate-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-lg">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-orange-500">
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
                            <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-600">Para quem é</p>
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
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-orange-500">
                                            <Store size={18} />
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-900">{item}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="processo" className="border-b border-slate-100 py-20 md:py-28">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="max-w-3xl">
                            <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-600">Como funciona</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter text-slate-950 md:text-5xl">
                                A entrada é simples: organizar a loja, publicar o cardápio e começar a operar.
                            </h2>
                        </div>

                        <div className="mt-12 grid gap-6 lg:grid-cols-3">
                            {HOW_IT_WORKS.map((item) => (
                                <article key={item.step} className="rounded-4xl border border-slate-100 bg-white p-7 shadow-sm">
                                    <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-600">Etapa {item.step}</p>
                                    <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="planos" className="border-b border-slate-100 bg-slate-50 py-20 md:py-28">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="max-w-3xl">
                            <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-600">Planos</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter text-slate-950 md:text-5xl">
                                Planos claros por volume da operação: preço, produtos e pedidos por mês.
                            </h2>
                            <p className="mt-5 text-base leading-relaxed text-slate-600">
                                Comece com o plano que faz sentido para o seu momento e ajuste conforme a loja cresce. Sem taxa por pedido e sem contrato de fidelidade.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 lg:grid-cols-3">
                            {PRICING_PLANS.map((plan) => (
                                <article
                                    key={plan.name}
                                    className={`rounded-4xl border p-7 shadow-sm ${plan.highlight
                                        ? "border-slate-950 bg-slate-950 text-white"
                                        : "border-slate-200 bg-white text-slate-900"
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${plan.highlight ? "text-orange-500" : "text-slate-400"}`}>
                                            {plan.name}
                                        </p>
                                        {plan.highlight && (
                                            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                                                Mais escolhido
                                            </span>
                                        )}
                                    </div>

                                    <p className={`mt-3 text-sm ${plan.highlight ? "text-slate-300" : "text-slate-600"}`}>{plan.subtitle}</p>

                                    <div className="mt-5 flex items-end gap-2">
                                        <span className="text-4xl font-black tracking-tight">R$ {plan.price}</span>
                                        <span className={`pb-1 text-xs font-bold uppercase tracking-[0.14em] ${plan.highlight ? "text-slate-400" : "text-slate-500"}`}>/mês</span>
                                    </div>

                                    <div className={`mt-6 space-y-3 rounded-3xl border p-4 ${plan.highlight ? "border-white/15 bg-white/5" : "border-slate-100 bg-slate-50"}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className={`text-[11px] font-black uppercase tracking-[0.14em] ${plan.highlight ? "text-slate-300" : "text-slate-500"}`}>Produtos</span>
                                            <span className="text-sm font-black tracking-tight">até {plan.maxProducts}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className={`text-[11px] font-black uppercase tracking-[0.14em] ${plan.highlight ? "text-slate-300" : "text-slate-500"}`}>Pedidos/mês</span>
                                            <span className="text-sm font-black tracking-tight">até {plan.maxOrders}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className={`text-[11px] font-black uppercase tracking-[0.14em] ${plan.highlight ? "text-slate-300" : "text-slate-500"}`}>Média diária</span>
                                            <span className="text-sm font-black tracking-tight">~ {plan.avgDailyOrders}/dia</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={openLeadWhatsApp}
                                        className={`mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[11px] font-black uppercase tracking-[0.14em] transition-all ${plan.highlight
                                            ? "bg-primary text-white hover:brightness-110"
                                            : "bg-slate-950 text-white hover:bg-black"
                                            }`}
                                    >
                                        Solicitar este plano <ArrowRight size={14} />
                                    </button>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="acesso" className="border-b border-slate-100 bg-slate-950 py-20 text-white md:py-28">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="max-w-3xl">
                            <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-500">Acesso</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter md:text-5xl">
                                Acesso guiado, configuração assistida e contato direto com a equipe.
                            </h2>
                            <p className="mt-5 text-base leading-relaxed text-slate-300">
                                Cada loja é configurada com acompanhamento da nossa equipe, do primeiro contato até o cardápio publicado e os primeiros pedidos chegando.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 lg:grid-cols-3">
                            {[
                                {
                                    name: "Configuração guiada",
                                    detail: "Ajuda para publicar a loja, ajustar o cardápio e deixar a operação pronta para vender.",
                                },
                                {
                                    name: "Canal próprio",
                                    detail: "Venda direta com cardápio, checkout e fluxo da loja sob seu controle.",
                                },
                                {
                                    name: "Atendimento próximo",
                                    detail: "Contato humano e acompanhamento contínuo para a operação rodar com segurança.",
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
                            <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-600">FAQ</p>
                            <h2 className="mt-4 text-3xl font-black tracking-tighter text-slate-950 md:text-5xl">
                                Respostas diretas para as principais dúvidas antes de você começar.
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
                                    <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-500">Próximo passo</p>
                                    <h2 className="mt-4 text-3xl font-black tracking-tighter md:text-5xl">
                                        Se faz sentido para o seu restaurante, vamos conversar de forma objetiva.
                                    </h2>
                                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
                                        A entrada é pensada para você ser atendido com atenção e clareza, com foco em colocar sua loja para operar de verdade.
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
                        © 2026 FOODSYSTEM.APP.BR - TODOS OS DIREITOS RESERVADOS.
                    </p>
                    <div className="flex flex-wrap gap-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        <a href="#solucao" className="transition-colors hover:text-primary">Solução</a>
                        <a href="#para-quem" className="transition-colors hover:text-primary">Para quem</a>
                        <a href="#planos" className="transition-colors hover:text-primary">Planos</a>
                        <a href="#acesso" className="transition-colors hover:text-primary">Acesso</a>
                        <a href="#faq" className="transition-colors hover:text-primary">FAQ</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}