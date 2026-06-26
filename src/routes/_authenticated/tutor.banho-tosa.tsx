import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Scissors, CalendarDays, Clock } from "lucide-react";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tutor/banho-tosa")({
  head: () => ({ meta: [{ title: "Agendar Banho e Tosa — Central Pet" }] }),
  component: TutorBanhoTosa,
});

// Working window: 09:00 - 17:00, 1h slots
const SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function TutorBanhoTosa() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [dogId, setDogId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState<string>("");

  const tutorQuery = useQuery({
    queryKey: ["tutor-self", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => (await supabase.from("tutors").select("id").eq("user_id", me!.userId).maybeSingle()).data,
  });

  const dogsQuery = useQuery({
    queryKey: ["tutor-dogs", tutorQuery.data?.id],
    enabled: !!tutorQuery.data?.id,
    queryFn: async () => (await supabase.from("dogs").select("id,name").eq("tutor_id", tutorQuery.data!.id).order("name")).data ?? [],
  });

  const servicesQuery = useQuery({
    queryKey: ["grooming-services-active"],
    queryFn: async () => (await supabase.from("grooming_services").select("id,name,duration_min,base_price").eq("is_active", true).order("name")).data ?? [],
  });

  // Existing appointments for the chosen day (any dog) — to block slots
  const dayAppointments = useQuery({
    queryKey: ["grooming-day", date],
    enabled: !!date,
    queryFn: async () => {
      const start = `${date}T00:00:00`;
      const end = `${date}T23:59:59`;
      const { data, error } = await supabase
        .from("grooming_appointments")
        .select("id,scheduled_at,duration_min,status")
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .neq("status", "cancelled");
      if (error) throw error;
      return data ?? [];
    },
  });

  const myAppointments = useQuery({
    queryKey: ["my-grooming", tutorQuery.data?.id],
    enabled: !!tutorQuery.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("grooming_appointments")
        .select("id,scheduled_at,status,duration_min,dog:dogs(name,tutor_id)")
        .order("scheduled_at", { ascending: false })
        .limit(20);
      const tid = tutorQuery.data!.id;
      return (data ?? []).filter((a: any) => a.dog?.tutor_id === tid);
    },
  });

  const bookedTimes = useMemo(() => {
    const set = new Set<string>();
    for (const a of dayAppointments.data ?? []) {
      const d = new Date(a.scheduled_at);
      set.add(format(d, "HH:mm"));
    }
    return set;
  }, [dayAppointments.data]);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const isPastDay = isBefore(startOfDay(parseISO(date)), startOfDay(new Date()));

  const create = useMutation({
    mutationFn: async () => {
      if (!dogId || !serviceId || !date || !time) throw new Error("Selecione cão, serviço, data e horário.");
      const svc = servicesQuery.data?.find((s: any) => s.id === serviceId);
      const scheduledIso = new Date(`${date}T${time}:00`).toISOString();

      // Server-side guard: re-check the slot just before insert
      const dayStart = `${date}T00:00:00`;
      const dayEnd = `${date}T23:59:59`;
      const { data: clash } = await supabase
        .from("grooming_appointments")
        .select("id,scheduled_at")
        .gte("scheduled_at", dayStart)
        .lte("scheduled_at", dayEnd)
        .neq("status", "cancelled");
      if ((clash ?? []).some((a: any) => format(new Date(a.scheduled_at), "HH:mm") === time)) {
        throw new Error("Este horário acabou de ser reservado por outro tutor. Escolha outro.");
      }

      const { data: appt, error } = await supabase
        .from("grooming_appointments")
        .insert({
          dog_id: dogId,
          scheduled_at: scheduledIso,
          duration_min: svc?.duration_min ?? 60,
          status: "scheduled",
          total_price: svc?.base_price ?? 0,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("grooming_appointment_services").insert({
        appointment_id: appt.id,
        service_id: serviceId,
        price: svc?.base_price ?? 0,
      } as any);
    },
    onSuccess: () => {
      toast.success("Agendamento confirmado!");
      setTime("");
      qc.invalidateQueries({ queryKey: ["grooming-day"] });
      qc.invalidateQueries({ queryKey: ["my-grooming"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const next7 = Array.from({ length: 8 }).map((_, i) => addDays(new Date(), i));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Agendar Banho e Tosa</h1>
        <p className="text-sm text-muted-foreground">Escolha o cão, o serviço, o dia e o horário disponível.</p>
      </header>

      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cão</Label>
              <Select value={dogId} onValueChange={setDogId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(dogsQuery.data ?? []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serviço</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(servicesQuery.data ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — R$ {Number(s.base_price ?? 0).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Dia</Label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {next7.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const active = key === date;
                return (
                  <button
                    key={key}
                    onClick={() => { setDate(key); setTime(""); }}
                    className={cn(
                      "min-w-[72px] rounded-xl border px-3 py-2 text-center text-xs transition",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                    )}
                  >
                    <p className="font-medium capitalize">{format(d, "EEE", { locale: ptBR })}</p>
                    <p className="text-lg font-semibold">{format(d, "dd")}</p>
                    <p className="opacity-70">{format(d, "MMM", { locale: ptBR })}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Horário</Label>
            {dayAppointments.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {SLOTS.map((s) => {
                  const taken = bookedTimes.has(s);
                  const past = date === todayKey && s <= format(new Date(), "HH:mm");
                  const disabled = taken || past || isPastDay;
                  const active = s === time;
                  return (
                    <button
                      key={s}
                      onClick={() => !disabled && setTime(s)}
                      disabled={disabled}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm transition",
                        active && "border-primary bg-primary text-primary-foreground",
                        !active && !disabled && "border-border hover:bg-muted",
                        disabled && "cursor-not-allowed border-dashed border-border bg-muted/50 text-muted-foreground line-through",
                      )}
                      title={taken ? "Horário reservado" : past ? "Já passou" : ""}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Horários riscados já estão reservados.</p>
          </div>

          <Button className="w-full" disabled={create.isPending || !dogId || !serviceId || !time} onClick={() => create.mutate()}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Scissors className="mr-2 h-4 w-4" /> Confirmar agendamento
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 font-medium">Meus agendamentos</h2>
        {!myAppointments.data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento ainda.</p>
        ) : (
          <ul className="space-y-2">
            {myAppointments.data.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <div>
                  <p className="font-medium">{a.dog?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(a.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Badge variant={a.status === "done" ? "default" : a.status === "cancelled" ? "destructive" : "secondary"}>
                  {a.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
