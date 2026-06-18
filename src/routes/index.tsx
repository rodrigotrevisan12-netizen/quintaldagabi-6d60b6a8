import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PawPrint,
  CalendarDays,
  BedDouble,
  Bath,
  FileText,
  Newspaper,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Users,
  BarChart3,
  Sparkles,
  ArrowRight,
  Check,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Central Pet — Software de gestão para creche, hospedagem e banho & tosa" },
      {
        name: "description",
        content:
          "Plataforma completa para pet shops, creches e hospedagens caninas: agenda, check-in, prontuário, contratos digitais, boletins e portal do tutor em um só lugar.",
      },
      { property: "og:title", content: "Central Pet — Gestão completa para o seu negócio pet" },
      {
        property: "og:description",
        content: "Tudo que sua creche, hospedagem e banho & tosa precisam para operar sem planilha.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://quintaldagabi.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://quintaldagabi.lovable.app/" }],
  }),
  component: Landing,
});

const MODULES = [
  { icon: CalendarDays, title: "Creche & day care", desc: "Check-in, check-out, controle de presença, alimentação, medicação e atividades do dia." },
  { icon: BedDouble, title: "Hospedagem", desc: "Entrada, saída prevista, pertences, ração, medicação, ocupação e relatório automático." },
  { icon: Bath, title: "Banho & tosa", desc: "Agendamento, status, fotos antes e depois, produtividade por funcionário." },
  { icon: ClipboardList, title: "Programação do dia", desc: "A administradora define tarefas, horários, locais e responsáveis. Funcionário só vê o que é dele." },
  { icon: Newspaper, title: "Boletins diários", desc: "Alimentação, hidratação, passeios, comportamento, fotos e vídeos enviados ao tutor." },
  { icon: FileText, title: "Documentos automáticos", desc: "Contratos, termos e autorizações com assinatura digital e PDF pronto." },
  { icon: HeartPulse, title: "Prontuário do pet", desc: "Vacinas, alergias, saúde, comportamento e timeline cronológica completa." },
  { icon: Users, title: "Cadastro de tutores", desc: "Dados, contato, consentimento LGPD e múltiplos cães por tutor." },
  { icon: BarChart3, title: "Painel & relatórios", desc: "Ocupação, presentes, vagas, produtividade e indicadores em tempo real." },
];

const BENEFITS = [
  "Sem planilha, sem WhatsApp bagunçado, sem perda de informação.",
  "Cada perfil (admin, funcionário, tutor) só enxerga o que precisa.",
  "Funciona no computador, tablet e celular.",
  "Backup em nuvem, dados protegidos e adequados à LGPD.",
  "Assinatura digital de contratos sem precisar imprimir.",
  "Tutores acompanham o dia do pet sem precisar ligar.",
];

const FAQ = [
  { q: "Preciso instalar alguma coisa?", a: "Não. Tudo roda no navegador — basta acessar pelo link do seu domínio. Funciona em qualquer computador, tablet ou celular." },
  { q: "Meus dados ficam seguros?", a: "Sim. Banco de dados em nuvem com regras de acesso por perfil, criptografia e backup automático. Cada funcionário só vê o que é da função dele." },
  { q: "Consigo personalizar contratos e a programação do dia?", a: "Sim. Os modelos de contrato têm variáveis automáticas (tutor, pet, datas) e a programação do dia é montada pela administradora tarefa a tarefa." },
  { q: "Quanto custa?", a: "O valor depende do tamanho do seu negócio. Fale com a gente para receber uma proposta personalizada." },
  { q: "Funciona para rede com mais de uma unidade?", a: "Sim. O sistema já nasceu preparado para múltiplas unidades, com separação de equipe e relatórios consolidados." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-[#fafbfc]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f46e5] shadow-lg shadow-indigo-500/30">
              <PawPrint className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Central Pet</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <a href="#modulos" className="hover:text-white">Módulos</a>
            <a href="#beneficios" className="hover:text-white">Benefícios</a>
            <a href="#depoimentos" className="hover:text-white">Depoimentos</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden text-sm text-white/80 hover:text-white sm:inline">
              Entrar
            </Link>
            <a
              href="#contato"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:bg-[#4338ca]"
            >
              Falar com vendas <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-32 top-0 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              <Sparkles className="h-3 w-3 text-indigo-400" /> Software pronto para o seu negócio pet
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              A operação inteira do seu{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                pet shop
              </span>{" "}
              num só sistema.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Creche, hospedagem, banho & tosa, contratos digitais, boletins diários e portal do tutor.
              Tudo conectado, em tempo real, sem planilha.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#contato"
                className="inline-flex items-center gap-2 rounded-lg bg-[#4f46e5] px-6 py-3 text-sm font-medium text-white shadow-xl shadow-indigo-500/30 transition hover:bg-[#4338ca]"
              >
                Solicitar demonstração <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#modulos"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Ver módulos
              </a>
            </div>
            <p className="mt-5 text-xs text-white/40">
              Já em uso em operação real · Implantação assistida · Suporte humano
            </p>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative mx-auto mt-20 max-w-5xl">
            <div className="absolute -inset-x-12 -inset-y-4 rounded-[2rem] bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-indigo-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141432] shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
                <span className="ml-3 text-xs text-white/40">central-pet · painel</span>
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
                {[
                  { label: "Presentes hoje", value: "24", sub: "de 30 vagas" },
                  { label: "Hospedagem", value: "8", sub: "ocupando 10 baias" },
                  { label: "Banhos do dia", value: "12", sub: "9 concluídos" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50">{s.label}</p>
                    <p className="mt-2 text-3xl font-semibold">{s.value}</p>
                    <p className="text-xs text-white/40">{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 p-6 pt-0 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Programação do dia</p>
                  <ul className="space-y-2 text-sm">
                    {["09:00 · Passeio grupo A", "11:00 · Banho — Thor", "14:00 · Brincadeira livre", "16:30 · Lanche da tarde"].map((t) => (
                      <li key={t} className="flex items-center gap-2 text-white/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Boletins recentes</p>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li>Mel · comeu tudo, brincou muito</li>
                    <li>Bento · descansou após o passeio</li>
                    <li>Nina · interagiu com novos amigos</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section id="modulos" className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-indigo-400">Módulos inclusos</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Tudo que o seu negócio pet precisa.
            </h2>
            <p className="mt-4 text-white/60">
              Nove módulos integrados. Sem cobrar a parte por funcionalidade básica.
            </p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition hover:border-indigo-500/40 hover:bg-white/[0.06]"
              >
                <span className="inline-grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300 transition group-hover:bg-indigo-500/25">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="relative border-t border-white/5 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-indigo-400">Por que mudar</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Menos retrabalho. Mais tempo cuidando dos pets.
            </h2>
            <p className="mt-4 text-white/60">
              A Central Pet substitui agenda de papel, planilha, grupo de WhatsApp e arquivos soltos
              por uma única tela limpa que toda a equipe entende.
            </p>
            <a
              href="#contato"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#4f46e5] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:bg-[#4338ca]"
            >
              Quero conhecer <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-indigo-300">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-white/85">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Segurança */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Adequado à LGPD", d: "Consentimento, separação por perfil e auditoria de acessos." },
            { icon: HeartPulse, t: "Pensado por quem opera", d: "Construído junto com uma creche real, em uso diário." },
            { icon: Sparkles, t: "Atualizações contínuas", d: "Novos recursos sem custo adicional para clientes ativos." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-white/10 p-6">
              <Icon className="h-5 w-5 text-indigo-400" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-white/60">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-indigo-400">Quem usa</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Recomendado por quem cuida.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote: "Tirei o caderno e o grupo de WhatsApp da operação. Hoje cada funcionário sabe exatamente o que fazer.",
                name: "Gabriela",
                role: "Quintal da Gabi · Pet creche",
              },
              {
                quote: "Os tutores ficaram encantados em receber o boletim com fotos todo dia. Virou diferencial de venda.",
                name: "Cliente piloto",
                role: "Hospedagem canina",
              },
              {
                quote: "Contrato assinado digital, sem papel. Cliente recebe e devolve em minutos.",
                name: "Equipe de banho & tosa",
                role: "Unidade parceira",
              },
            ].map((t) => (
              <figure key={t.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <blockquote className="text-sm leading-relaxed text-white/85">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-xs">
                  <span className="font-medium text-white">{t.name}</span>
                  <span className="text-white/50"> · {t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-indigo-400">Dúvidas frequentes</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Antes de falar com a gente.</h2>
          </div>
          <div className="mt-12 space-y-3">
            {FAQ.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* Contato / CTA */}
      <section id="contato" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent p-10 text-center md:p-16">
            <div className="pointer-events-none absolute inset-0 opacity-50">
              <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/30 blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Pronto para profissionalizar sua operação?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/70">
                Conte para a gente sobre o seu negócio. Mostramos a Central Pet por dentro e fazemos
                uma proposta sob medida.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href="mailto:contato@centralpet.com.br"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#4f46e5] px-6 py-3 text-sm font-medium text-white shadow-xl shadow-indigo-500/30 transition hover:bg-[#4338ca]"
                >
                  Falar por e-mail <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="https://wa.me/"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
                >
                  WhatsApp
                </a>
              </div>
              <p className="mt-6 text-xs text-white/40">
                Contatos serão configurados antes do lançamento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-white/50 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-500/20">
              <PawPrint className="h-3.5 w-3.5 text-indigo-300" />
            </span>
            <span>© {new Date().getFullYear()} Central Pet. Todos os direitos reservados.</span>
          </div>
          <div className="flex gap-6">
            <Link to="/auth" className="hover:text-white">Acessar painel</Link>
            <a href="#contato" className="hover:text-white">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium hover:bg-white/[0.03]"
      >
        <span>{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="px-5 pb-4 text-sm leading-relaxed text-white/65">{a}</div> : null}
    </div>
  );
}
