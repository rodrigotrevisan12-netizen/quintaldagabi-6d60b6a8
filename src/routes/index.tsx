import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Dog,
  Users,
  FileText,
  Wallet,
  BarChart3,
  Palette,
  Smartphone,
  HeartHandshake,
} from "lucide-react";
import type { ComponentType } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Central Pet — Gestão completa para creches, hotéis e day cares caninos" },
      {
        name: "description",
        content:
          "Central Pet: sistema multiempresa para creches, hotéis e day cares caninos. Agenda, tutores, contratos, boletins, financeiro e portal do tutor em um só lugar.",
      },
      { property: "og:title", content: "Central Pet — Gestão completa para o seu negócio pet" },
      {
        property: "og:description",
        content: "Mais tempo cuidando dos cães, menos tempo com planilha.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

type Feature = { icon: ComponentType<{ className?: string }>; title: string; desc: string };

const FEATURES: Feature[] = [
  { icon: CalendarDays, title: "Agendamentos", desc: "Controle a agenda de creche, hospedagem, banho e day care." },
  { icon: Dog, title: "Gestão de cães", desc: "Ficha completa: vacinas, alergias, comportamento e alimentação." },
  { icon: Users, title: "Tutores", desc: "Cadastro, contatos, autorizações e portal exclusivo." },
  { icon: FileText, title: "Contratos digitais", desc: "Termos e autorizações com assinatura em minutos." },
  { icon: Wallet, title: "Financeiro", desc: "Cobranças, planos mensais, recibos e inadimplência." },
  { icon: BarChart3, title: "Relatórios", desc: "Ocupação, faturamento e performance por unidade." },
  { icon: Palette, title: "White label", desc: "Cada empresa com seu nome, logo e cores." },
  { icon: Smartphone, title: "Multiplataforma", desc: "Computador, tablet ou celular, sem instalar nada." },
  { icon: HeartHandshake, title: "Suporte humano", desc: "Equipe que entende creche e hotel canino de verdade." },
];

const PLANS = [
  { name: "Mensal", desc: "Pague todo mês", price: "R$ 220,00", per: "/mês", popular: false },
  { name: "Trimestral", desc: "Economia a cada 3 meses", price: "R$ 620,00", per: "/trimestre", popular: true },
  { name: "Semestral", desc: "Ainda mais praticidade", price: "R$ 1.200,00", per: "/semestre", popular: false },
  { name: "Anual", desc: "O melhor custo-benefício", price: "R$ 2.200,00", per: "/ano", popular: false },
];

function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={
        "grid h-10 w-10 place-items-center rounded-full text-xl text-white shadow-lg " + className
      }
      style={{ background: "linear-gradient(135deg,#FF7F50,#FFCA3A)" }}
      aria-hidden
    >
      🐾
    </span>
  );
}

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-orange-50/40 font-sans text-gray-700 antialiased">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-orange-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2">
            <Logo />
            <span className="bg-gradient-to-r from-[#E86A3C] to-[#FF9F43] bg-clip-text text-2xl font-extrabold text-transparent">
              Central Pet
            </span>
          </a>
          <div className="hidden items-center gap-8 font-medium text-gray-600 md:flex">
            <a href="#funcionalidades" className="hover:text-[#FF7F50]">Funcionalidades</a>
            <a href="#planos" className="hover:text-[#FF7F50]">Planos</a>
            <a href="#depoimentos" className="hover:text-[#FF7F50]">Depoimentos</a>
            <Link to="/auth" className="hover:text-[#FF7F50]">Acessar</Link>
            <Link
              to="/comprar"
              className="rounded-full bg-gradient-to-r from-[#FF7F50] to-[#FF9F43] px-6 py-2.5 font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Começar grátis
            </Link>
          </div>
          <Link
            to="/comprar"
            className="rounded-full bg-gradient-to-r from-[#FF7F50] to-[#FF9F43] px-4 py-2 text-sm font-semibold text-white shadow-lg md:hidden"
          >
            Começar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden pt-32 pb-20 lg:pt-44 lg:pb-32">
        <span
          className="pointer-events-none absolute -left-16 top-24 h-72 w-72 rounded-full opacity-35 blur-3xl"
          style={{ background: "#FF7F50" }}
        />
        <span
          className="pointer-events-none absolute -right-16 bottom-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ background: "#FFD66B" }}
        />
        <span className="pointer-events-none absolute left-10 top-24 text-6xl opacity-10">🐾</span>
        <span className="pointer-events-none absolute right-16 bottom-24 text-5xl opacity-10">🐾</span>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <span className="mb-6 inline-block rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-[#E86A3C]">
                🐶 Feito para quem ama cachorro
              </span>
              <h1 className="mb-6 text-4xl font-extrabold leading-tight text-gray-800 sm:text-5xl lg:text-6xl">
                A rotina da sua{" "}
                <span className="bg-gradient-to-r from-[#FF7F50] to-[#FF9F43] bg-clip-text text-transparent">
                  creche canina
                </span>{" "}
                organizada de um jeito lindo
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-gray-600">
                A Central Pet é o sistema mais amigável do mercado para creches, hotéis e day cares de cães.
                Agendamentos, tutores, contratos, financeiro e muito mais — tudo em um só lugar.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <a
                  href="#planos"
                  className="rounded-full bg-gradient-to-r from-[#FF7F50] to-[#FF9F43] px-8 py-4 text-center text-lg font-bold text-white shadow-xl transition-transform hover:-translate-y-1"
                >
                  Ver planos
                </a>
                <a
                  href="#funcionalidades"
                  className="rounded-full border border-orange-100 bg-white px-8 py-4 text-center text-lg font-bold text-[#FF7F50] shadow-lg transition-transform hover:-translate-y-1"
                >
                  Conhecer funcionalidades
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl border-4 border-white shadow-2xl transition-transform duration-500 hover:rotate-0 rotate-2">
                <img
                  src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=1000&q=80"
                  alt="Cachorro feliz em creche canina"
                  className="h-auto w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-6">
                  <p className="text-lg font-semibold text-white">
                    Mais tempo para abraçar, menos tempo com planilhas ❤️
                  </p>
                </div>
              </div>
              <div className="absolute -right-6 -top-6 hidden animate-bounce rounded-2xl bg-white p-4 shadow-xl sm:block">🐕</div>
              <div className="absolute -bottom-4 -left-4 hidden rounded-2xl bg-[#FFD66B] p-4 shadow-xl sm:block">💖</div>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-[#FF7F50]">Tudo que você precisa</span>
            <h2 className="mt-3 mb-4 text-3xl font-extrabold text-gray-800 sm:text-4xl">
              Funcionalidades que fazem seu dia correr melhor
            </h2>
            <p className="text-lg text-gray-600">Desenvolvido para creches, hotéis e day cares caninos.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-3xl border border-orange-100 bg-orange-50 p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg,#FF7F50,#FF9F43)" }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-800">{title}</h3>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-white py-20">
        <span className="pointer-events-none absolute right-10 top-20 rotate-12 text-7xl opacity-10">🐾</span>
        <span className="pointer-events-none absolute -left-2 bottom-20 -rotate-12 text-6xl opacity-10">🐾</span>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-[#FF7F50]">Planos e preços</span>
            <h2 className="mt-3 mb-4 text-3xl font-extrabold text-gray-800 sm:text-4xl">
              Escolha o período ideal para você
            </h2>
            <p className="text-lg text-gray-600">
              Todos os planos incluem <strong>todas as funcionalidades</strong>.
            </p>
          </div>
          <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  "relative flex flex-col rounded-3xl border-2 bg-white p-8 transition-all hover:-translate-y-2 hover:shadow-2xl " +
                  (p.popular ? "border-[#FF9F43]" : "border-orange-100")
                }
              >
                {p.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#FF7F50] to-[#FF9F43] px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                    POPULAR
                  </div>
                )}
                <h3 className="mb-2 text-xl font-bold text-gray-800">{p.name}</h3>
                <p className="mb-6 text-sm text-gray-500">{p.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-[#FF7F50]">{p.price}</span>
                  <span className="text-gray-500">{p.per}</span>
                </div>
                <Link
                  to="/auth"
                  className="mt-auto w-full rounded-xl bg-gradient-to-r from-[#FF7F50] to-[#FF9F43] py-3 text-center font-bold text-white shadow-lg transition-all hover:from-[#E86A3C]"
                >
                  Assinar plano
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-[#FF7F50]">Depoimentos</span>
            <h2 className="mt-3 mb-4 text-3xl font-extrabold text-gray-800 sm:text-4xl">
              O que os nossos clientes dizem
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex min-h-[200px] items-center justify-center rounded-3xl border border-dashed border-orange-100 bg-orange-50 p-8 text-center italic text-gray-500"
              >
                Depoimento em breve...
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF7F50] to-[#FF9F43]" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <span className="mb-6 block text-5xl">🐕🦴🐾</span>
          <h2 className="mb-6 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Pronto para transformar sua creche canina?
          </h2>
          <p className="mb-10 text-lg text-white/90">
            Junte-se à Central Pet e cuide do que importa.
          </p>
          <Link
            to="/auth"
            className="inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-[#FF7F50] shadow-2xl transition-transform hover:-translate-y-1"
          >
            Quero começar agora
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-400">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Logo className="h-9 w-9 text-base" />
            <span className="text-xl font-extrabold text-white">Central Pet</span>
          </div>
          <p>© {new Date().getFullYear()} Central Pet. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
