import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Início — Quintal da Gabi" }] }),
  component: Dashboard,
});

type HealthAlert = {
  record_id: string;
  dog_id: string;
  dog_name: string;
  kind: "vacina" | "vermifugo" | "antipulgas";
  item: string;
  next_due_date: string;
  days_remaining: number;
  status: "vencido" | "proximo" | "em_dia";
};

function Dashboard() {
  const { data: me } = useCurrentUser();
  const role = me?.primaryRole ?? "tutor";
  const first = (me?.fullName ?? me?.email ?? "").split(" ")[0] ?? "";

  const counts = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const today = new Date();
      const startToday = new Date(today); startToday.setHours(0, 0, 0, 0);
      const endToday = new Date(today); endToday.setHours(23, 59, 59, 999);
      const nowIso = new Date().toISOString();

      const [tutors, daycare, boarding, grooming] = await Promise.all([
        supabase.from("tutors").select("*", { count: "exact", head: true }),
        supabase.from("daycare_stays").select("*", { count: "exact", head: true }).is("check_out_at", null),
        supabase.from("boarding_stays").select("*", { count: "exact", head: true }).is("check_out_at", null).lte("check_in_at", nowIso),
        supabase.from("grooming_appointments").select("*", { count: "exact", head: true })
          .gte("scheduled_at", startToday.toISOString())
          .lte("scheduled_at", endToday.toISOString()),
      ]);
      return {
        tutors: tutors.count ?? 0,
        present: daycare.count ?? 0,
        boarding: boarding.count ?? 0,
        grooming: grooming.count ?? 0,
      };
    },
  });
  const v = (n?: number) => (counts.isLoading ? "…" : String(n ?? 0));

  const alertsQ = useQuery({
    queryKey: ["health-alerts-dashboard"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_health_alerts")
        .select("*")
        .neq("status", "em_dia")
        .order("next_due_date", { ascending: true })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as HealthAlert[];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["payments-alerts-dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, description, amount, due_date, status")
        .eq("kind", "receita")
        .in("status", ["pendente", "vencido"])
        .lte("due_date", today)
        .order("due_date", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data ?? [];
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
        <Card icon={<Dog className="h-5 w-5" />} label="Cães na creche" value={v(counts.data?.present)} />
        <Card icon={<BedDouble className="h-5 w-5" />} label="Hospedagens ativas" value={v(counts.data?.boarding)} />
        <Card icon={<Bath className="h-5 w-5" />} label="Banhos hoje" value={v(counts.data?.grooming)} />
        <Card icon={<CalendarDays className="h-5 w-5" />} label="Agendamentos hoje" value={v(counts.data?.grooming)} />
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
          to="/app/saude"
          items={(alertsQ.data ?? []).map((a) => ({
            id: a.record_id,
            title: `${a.dog_name} — ${a.item}`,
            subtitle: `${labelKind(a.kind)} • vence ${new Date(a.next_due_date).toLocaleDateString("pt-BR")}`,
            tone: a.status === "vencido" ? "danger" : "warning",
            badge: a.status === "vencido" ? `${Math.abs(a.days_remaining)}d atrasado` : `em ${a.days_remaining}d`,
          }))}
        />
        <AlertsBlock
          icon={<CreditCard className="h-5 w-5" />}
          title="Alertas de pagamentos"
          empty="Sem cobranças pendentes hoje."
          to="/app/financeiro"
          items={(paymentsQ.data ?? []).map((p: any) => ({
            id: p.id,
            title: p.description ?? "Cobrança",
            subtitle: `Vence ${new Date(p.due_date).toLocaleDateString("pt-BR")}`,
            tone: p.status === "vencido" ? "danger" : "warning",
            badge: `R$ ${Number(p.amount ?? 0).toFixed(2)}`,
          }))}
        />
      </div>
    </div>
  );
}

function labelKind(k: string) {
  return k === "vacina" ? "Vacina" : k === "vermifugo" ? "Vermífugo" : "Antipulgas";
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

type AlertItem = { id: string; title: string; subtitle: string; tone: "danger" | "warning"; badge: string };

function AlertsBlock({
  icon,
  title,
  empty,
  items,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  items?: AlertItem[];
  to?: string;
}) {
  const list = items ?? [];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">{icon}</span>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
        </div>
        {to && list.length > 0 ? (
          <Link to={to} className="text-xs text-primary hover:underline">Ver todos</Link>
        ) : null}
      </div>
      {list.length === 0 ? (
        <p className="mt-4 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y">
          {list.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{it.title}</p>
                <p className="truncate text-xs text-muted-foreground">{it.subtitle}</p>
              </div>
              <Badge variant={it.tone === "danger" ? "destructive" : "secondary"}>{it.badge}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
