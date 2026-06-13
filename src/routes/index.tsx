import { createFileRoute, Link } from "@tanstack/react-router";
import { PawPrint, CalendarHeart, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quintal da Gabi — Pet creche, hospedagem e banho & tosa" },
      {
        name: "description",
        content:
          "Gestão completa do Quintal da Gabi: agenda, prontuário dos cães, portal do tutor e operação do dia a dia.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <PawPrint className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Quintal da Gabi
          </span>
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent">
              Cuidado feito com carinho
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
              A rotina do seu cão{" "}
              <span className="text-primary">organizada</span> num só lugar.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Creche, hospedagem, banho e tosa — agenda, prontuário e
              comunicação com o tutor, sem planilha e sem confusão.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Acessar minha conta</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#recursos">Conhecer recursos</a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/15 via-accent/15 to-transparent blur-2xl" />
            <div className="relative grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
              <Feature
                icon={<CalendarHeart className="h-5 w-5" />}
                title="Agenda inteligente"
                desc="Creche, banho e hospedagem com check-in e check-out."
              />
              <Feature
                icon={<PawPrint className="h-5 w-5" />}
                title="Prontuário do cão"
                desc="Vacinas, alergias, comportamento e histórico de estadias."
              />
              <Feature
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Adequado à LGPD"
                desc="Cada perfil só enxerga o que é dele. Tudo auditado."
              />
            </div>
          </div>
        </section>

        <section id="recursos" className="mt-24 grid gap-4 sm:grid-cols-3">
          {[
            ["Tutores", "Cadastro completo, endereço, contato e consentimento."],
            ["Cães", "Foto, raça, peso, vacinas, observações de comportamento."],
            ["Agenda", "Visão por dia, semana e funcionário responsável."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-secondary/50 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
