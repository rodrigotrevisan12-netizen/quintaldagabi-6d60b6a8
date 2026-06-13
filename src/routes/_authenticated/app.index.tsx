import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Dog, Users, ShieldCheck } from "lucide-react";

import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Início — Quintal da Gabi" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useCurrentUser();
  const role = me?.primaryRole ?? "tutor";
  const first = (me?.fullName ?? me?.email ?? "").split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<CalendarDays className="h-5 w-5" />} label="Agendamentos hoje" value="—" />
        <Stat icon={<Dog className="h-5 w-5" />} label="Cães na casa" value="—" />
        <Stat icon={<Users className="h-5 w-5" />} label="Tutores ativos" value="—" />
        <Stat icon={<ShieldCheck className="h-5 w-5" />} label="Seu perfil" value={roleLabel(role)} />
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="font-display text-lg">Próxima etapa</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Em seguida vou montar os cadastros de tutores e cães, depois a agenda.
          Esta tela vai ganhar os números reais quando os dados começarem a entrar.
        </p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-4 font-display text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function roleLabel(r: string) {
  if (r === "admin") return "Administradora";
  if (r === "funcionario") return "Funcionário";
  return "Tutor";
}
