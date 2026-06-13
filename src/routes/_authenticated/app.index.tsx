import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Dog,
  Users,
  BedDouble,
  Bath,
  AlertCircle,
  ListChecks,
  Wallet,
  Syringe,
  CreditCard,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Início — Quintal da Gabi" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useCurrentUser();
  const role = me?.primaryRole ?? "tutor";
  const first = (me?.fullName ?? me?.email ?? "").split(" ")[0] ?? "";

  const counts = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const { count: tutorsCount } = await supabase
        .from("tutors")
        .select("*", { count: "exact", head: true });
      return { tutors: tutorsCount ?? 0 };
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Olá{first ? `, ${first}` : ""} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          {role === "tutor"
            ? "Aqui você acompanha seus cães e os próximos serviços."
            : "Aqui está um resumo do dia no Quintal da Gabi."}
        </p>
      </div>

      {/* Indicadores principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={<Dog className="h-5 w-5" />} label="Cães presentes" value="—" hint="agenda em breve" />
        <Card icon={<BedDouble className="h-5 w-5" />} label="Hospedagens ativas" value="—" hint="em breve" />
        <Card icon={<Bath className="h-5 w-5" />} label="Banhos hoje" value="—" hint="em breve" />
        <Card icon={<CalendarDays className="h-5 w-5" />} label="Agendamentos hoje" value="—" hint="em breve" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={<Users className="h-5 w-5" />}
          label="Tutores cadastrados"
          value={counts.isLoading ? "…" : String(counts.data?.tutors ?? 0)}
        />
        <Card icon={<AlertCircle className="h-5 w-5" />} label="Ocorrências do dia" value="—" hint="em breve" />
        <Card icon={<ListChecks className="h-5 w-5" />} label="Tarefas pendentes" value="—" hint="em breve" />
        <Card icon={<Wallet className="h-5 w-5" />} label="A receber hoje" value="—" hint="em breve" />
      </div>

      {/* Alertas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AlertsBlock
          icon={<Syringe className="h-5 w-5" />}
          title="Alertas de vacinas"
          empty="Quando você cadastrar vacinas dos cães, os vencimentos próximos aparecem aqui."
        />
        <AlertsBlock
          icon={<CreditCard className="h-5 w-5" />}
          title="Alertas de pagamentos"
          empty="Quando o financeiro estiver ativo, mensalidades e contas em atraso aparecem aqui."
        />
      </div>
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        {hint ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-display text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function AlertsBlock({
  icon,
  title,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
          {icon}
        </span>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-4 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">{empty}</p>
    </div>
  );
}
