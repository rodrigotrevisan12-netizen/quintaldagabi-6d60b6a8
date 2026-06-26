import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dog, Newspaper, FileText, Receipt, Send, Syringe, Activity, Bath, BedDouble } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/tutor/")({
  head: () => ({ meta: [{ title: "Área do tutor — Quintal da Gabi" }] }),
  component: TutorHome,
});

function TutorHome() {
  const { data: me } = useCurrentUser();

  const { data: tutor } = useQuery({
    queryKey: ["my-tutor", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data } = await supabase.from("tutors").select("id, full_name").eq("user_id", me!.userId).maybeSingle();
      return data;
    },
  });

  const { data: dogs } = useQuery({
    queryKey: ["my-dogs", tutor?.id],
    enabled: !!tutor?.id,
    queryFn: async () => {
      const { data } = await supabase.from("dogs").select("id, name, breed, photo_url").eq("tutor_id", tutor!.id);
      return data ?? [];
    },
  });

  const { data: arrival } = useQuery({
    queryKey: ["arrival-active", tutor?.id],
    enabled: !!tutor?.id,
    queryFn: async () => {
      const { data } = await supabase.from("arrival_notifications")
        .select("*").eq("tutor_id", tutor!.id).eq("status","on_the_way")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["tutor-health-alerts", tutor?.id],
    enabled: !!tutor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("v_health_alerts").select("*")
        .eq("tutor_id", tutor!.id).neq("status", "em_dia")
        .order("next_due_date", { ascending: true }).limit(5);
      return data ?? [];
    },
  });

  const dogIds = (dogs ?? []).map((d) => d.id);

  const todayInfo = useQuery({
    queryKey: ["tutor-today", dogIds.join(",")],
    enabled: dogIds.length > 0,
    queryFn: async () => {
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      const nowIso = new Date().toISOString();
      const upcomingFrom = new Date(); // a partir de agora
      const [present, boarding, upcoming, bulletin] = await Promise.all([
        supabase.from("daycare_stays")
          .select("id, check_in_at, dog:dogs(name)")
          .in("dog_id", dogIds).is("check_out_at", null),
        supabase.from("boarding_stays")
          .select("id, check_in_at, check_out_at, dog:dogs(name)")
          .in("dog_id", dogIds).is("check_out_at", null).lte("check_in_at", nowIso),
        supabase.from("grooming_appointments")
          .select("id, scheduled_at, status, dog:dogs(name)")
          .in("dog_id", dogIds)
          .gte("scheduled_at", upcomingFrom.toISOString())
          .in("status", ["scheduled", "in_progress"])
          .order("scheduled_at", { ascending: true }).limit(5),
        supabase.from("daily_reports")
          .select("id, dog_id, report_date, dog:dogs(name)")
          .in("dog_id", dogIds)
          .eq("report_date", startToday.toISOString().slice(0, 10))
          .limit(5),
      ]);
      return {
        present: present.data ?? [],
        boarding: boarding.data ?? [],
        upcoming: upcoming.data ?? [],
        bulletin: bulletin.data ?? [],
      };
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Olá, {tutor?.full_name?.split(" ")[0] ?? "tutor"}!</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seus cães, boletins e documentos.</p>
      </header>

      {alerts && alerts.length > 0 ? (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Syringe className="h-4 w-4 text-amber-600" />
              Atenção à saúde do seu pet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {alerts.map((a: any) => (
              <div key={`${a.kind}-${a.record_id}`} className="flex items-center justify-between text-sm">
                <span><strong>{a.dog_name}</strong> — {a.item}</span>
                <Badge variant={a.status === "vencido" ? "destructive" : "secondary"}>
                  {a.status === "vencido" ? `${Math.abs(a.days_remaining)}d atrasado` : `em ${a.days_remaining}d`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {arrival ? (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <Badge>Estou a caminho</Badge>
              <p className="mt-1 text-sm">Chegada estimada em <strong>{arrival.eta_minutes} min</strong></p>
            </div>
            <Link to="/tutor/chegada"><span className="text-sm text-primary underline">Gerenciar</span></Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickCard to="/tutor/chegada" icon={Send} label="Estou a caminho" />
        <QuickCard to="/tutor/boletins" icon={Newspaper} label="Boletins" />
        <QuickCard to="/tutor/documentos" icon={FileText} label="Contratos" />
        <QuickCard to="/tutor/financeiro" icon={Receipt} label="Recibos" />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Meus cães</h2>
        {!dogs?.length ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum cão cadastrado.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dogs.map((d) => (
              <Link key={d.id} to="/tutor/caes/$id" params={{ id: d.id }}>
                <Card className="hover:border-primary">
                  <CardContent className="flex items-center gap-3 p-4">
                    {d.photo_url ? <img src={d.photo_url} alt={d.name} className="h-12 w-12 rounded-full object-cover" /> :
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted"><Dog className="h-5 w-5" /></span>}
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.breed ?? "—"}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickCard({ to, icon: Icon, label }: { to: any; icon: any; label: string }) {
  return (
    <Link to={to}>
      <Card className="hover:border-primary">
        <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
          <Icon className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
