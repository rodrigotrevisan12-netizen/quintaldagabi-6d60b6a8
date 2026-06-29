import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptLocale from "@fullcalendar/core/locales/pt-br";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/app/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Quintal da Gabi" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const navigate = useNavigate();

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
      const to = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString();

      const [groom, board, day] = await Promise.all([
        supabase.from("grooming_appointments")
          .select("id,scheduled_at,status,dog:dogs(name)")
          .gte("scheduled_at", from).lte("scheduled_at", to),
        supabase.from("boarding_stays")
          .select("id,check_in_at,expected_check_out_at,check_out_at,dog:dogs(name)")
          .gte("check_in_at", from).lte("check_in_at", to),
        supabase.from("daycare_stays")
          .select("id,check_in_at,check_out_at,dog:dogs(name)")
          .gte("check_in_at", from).lte("check_in_at", to),
      ]);

      const list: any[] = [];
      (groom.data ?? []).forEach((g: any) => list.push({
        id: `g-${g.id}`, title: `🛁 ${g.dog?.name ?? "Banho"}`,
        start: g.scheduled_at, backgroundColor: "#3b82f6", borderColor: "#3b82f6",
        extendedProps: { route: "/app/banho-tosa" },
      }));
      (board.data ?? []).forEach((b: any) => list.push({
        id: `b-${b.id}`, title: `🏨 ${b.dog?.name ?? "Hospedagem"}`,
        start: b.check_in_at, end: b.check_out_at ?? b.expected_check_out_at,
        backgroundColor: "#a855f7", borderColor: "#a855f7",
        extendedProps: { route: "/app/hospedagem" },
      }));
      (day.data ?? []).forEach((d: any) => list.push({
        id: `d-${d.id}`, title: `🐕 ${d.dog?.name ?? "Creche"}`,
        start: d.check_in_at, end: d.check_out_at ?? undefined,
        backgroundColor: "#10b981", borderColor: "#10b981",
        extendedProps: { route: "/app/agenda" },
      }));
      return list;
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl">Calendário</h1>
        <p className="text-sm text-muted-foreground">
          Hospedagem, creche e banho & tosa em uma única visão.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 text-xs">
        <Legend color="#3b82f6" label="Banho & tosa" />
        <Legend color="#a855f7" label="Hospedagem" />
        <Legend color="#10b981" label="Creche" />
      </div>

      <Card>
        <CardContent className="p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={ptLocale}
            headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
            events={events}
            height="auto"
            eventClick={(info) => {
              const r = info.event.extendedProps.route as string | undefined;
              if (r) navigate({ to: r });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm" style={{ background: color }} /> {label}
    </span>
  );
}
