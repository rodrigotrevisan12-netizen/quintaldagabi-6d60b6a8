import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays, BedDouble, Bath, FileText, Syringe, ShieldCheck,
  Stethoscope, HeartPulse, Sparkles, ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/caes/$id/timeline")({
  head: () => ({ meta: [{ title: "Timeline do Pet — Quintal da Gabi" }] }),
  component: TimelinePage,
});

type Event = {
  dog_id: string;
  event_type: string;
  event_at: string;
  summary: string;
  payload: Record<string, unknown> | null;
};

const EVENT_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  daycare_stay: { label: "Creche", icon: CalendarDays },
  boarding_stay: { label: "Hospedagem", icon: BedDouble },
  grooming: { label: "Banho & Tosa", icon: Bath },
  daily_report: { label: "Boletim", icon: FileText },
  vaccine: { label: "Vacina", icon: Syringe },
  deworming: { label: "Vermífugo", icon: ShieldCheck },
  flea: { label: "Antipulgas", icon: ShieldCheck },
  medical: { label: "Saúde", icon: Stethoscope },
  behavior: { label: "Comportamento", icon: HeartPulse },
  document: { label: "Documento", icon: FileText },
};

function TimelinePage() {
  const { id } = Route.useParams();
  const [filter, setFilter] = useState<string>("all");

  const dogQuery = useQuery({
    queryKey: ["dog", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("dogs").select("id,name,photo_url,breed").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["timeline", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dog_timeline_events" as any)
        .select("*")
        .eq("dog_id", id)
        .order("event_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Event[];
    },
  });

  const events = (eventsQuery.data ?? []).filter((e) => filter === "all" || e.event_type === filter);

  const filterOptions = [
    { v: "all", l: "Tudo" },
    { v: "daycare_stay", l: "Creche" },
    { v: "boarding_stay", l: "Hospedagem" },
    { v: "grooming", l: "Banho & Tosa" },
    { v: "daily_report", l: "Boletins" },
    { v: "vaccine", l: "Saúde" },
    { v: "document", l: "Documentos" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/app/caes"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link></Button>
        <div className="flex items-center gap-3">
          {dogQuery.data?.photo_url ? (
            <img src={dogQuery.data.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span>
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold">{dogQuery.data?.name ?? "—"}</h1>
            <p className="text-sm text-muted-foreground">{dogQuery.data?.breed ?? "Sem raça"}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((f) => (
          <Button key={f.v} size="sm" variant={filter === f.v ? "default" : "outline"} onClick={() => setFilter(f.v)}>
            {f.l}
          </Button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        {eventsQuery.isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : events.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Sem eventos.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-6">
            {events.map((e, idx) => {
              const meta = EVENT_META[e.event_type] ?? { label: e.event_type, icon: Sparkles };
              const Icon = meta.icon;
              return (
                <li key={idx} className="relative">
                  <span className="absolute -left-[34px] grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.event_at), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{e.summary}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
