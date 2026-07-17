import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Search, Play, Check, X, Camera, Upload } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { validateFile, IMAGE_TYPES } from "@/lib/file-validation";

export const Route = createFileRoute("/_authenticated/app/banho-tosa")({
  head: () => ({ meta: [{ title: "Banho & tosa — Quintal da Gabi" }] }),
  component: GroomingPage,
});

type Service = { id: string; name: string; duration_min: number; base_price: number };
type Appt = {
  id: string;
  dog_id: string;
  scheduled_at: string;
  duration_min: number;
  groomer_id: string | null;
  status: "scheduled" | "in_progress" | "done" | "cancelled" | "no_show";
  started_at: string | null;
  finished_at: string | null;
  total_price: number;
  notes: string | null;
  dog: { id: string; name: string; photo_url: string | null; tutor: { full_name: string } | null } | null;
  groomer: { id: string; full_name: string | null } | null;
};

function GroomingPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [view, setView] = useState<"agenda" | "produtividade">("agenda");

  const apptsQuery = useQuery({
    queryKey: ["grooming-day", date],
    queryFn: async () => {
      const d = new Date(date + "T00:00");
      const { data, error } = await supabase
        .from("grooming_appointments")
        .select(
          "id,dog_id,scheduled_at,duration_min,groomer_id,status,started_at,finished_at,total_price,notes,dog:dogs(id,name,photo_url,tutor:tutors(full_name)),groomer:profiles!grooming_appointments_groomer_id_fkey(id,full_name)",
        )
        .gte("scheduled_at", startOfDay(d).toISOString())
        .lte("scheduled_at", endOfDay(d).toISOString())
        .order("scheduled_at");
      if (error) throw error;
      return (data ?? []) as unknown as Appt[];
    },
    enabled: view === "agenda",
  });

  const groups = useMemo(() => {
    const a = apptsQuery.data ?? [];
    return {
      scheduled: a.filter((x) => x.status === "scheduled"),
      in_progress: a.filter((x) => x.status === "in_progress"),
      done: a.filter((x) => x.status === "done"),
      other: a.filter((x) => x.status === "cancelled" || x.status === "no_show"),
    };
  }, [apptsQuery.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Banho & tosa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Agendamentos, fila do dia, fotos antes/depois e produtividade.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo agendamento
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={view === "agenda" ? "default" : "outline"} onClick={() => setView("agenda")}>Agenda do dia</Button>
        <Button size="sm" variant={view === "produtividade" ? "default" : "outline"} onClick={() => setView("produtividade")}>Produtividade</Button>
      </div>

      {view === "agenda" ? (
        <>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Data:</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          </div>
          {apptsQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <Column title="Agendados" tone="default" items={groups.scheduled} onOpen={setEditing} />
              <Column title="Em execução" tone="primary" items={groups.in_progress} onOpen={setEditing} />
              <Column title="Concluídos" tone="secondary" items={[...groups.done, ...groups.other]} onOpen={setEditing} />
            </div>
          )}
        </>
      ) : (
        <ProductivityPanel />
      )}

      <ApptSheet
        open={creating || editing !== null}
        appt={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onDone={() => qc.invalidateQueries({ queryKey: ["grooming-day"] })}
      />
    </div>
  );
}

function Column({
  title,
  tone,
  items,
  onOpen,
}: {
  title: string;
  tone: "default" | "primary" | "secondary";
  items: Appt[];
  onOpen: (a: Appt) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-base font-semibold">
        {title} <span className="text-muted-foreground">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Vazio.</p>
      ) : (
        items.map((a) => (
          <button
            key={a.id}
            onClick={() => onOpen(a)}
            className={`w-full rounded-xl border border-border p-3 text-left transition-shadow hover:shadow ${tone === "primary" ? "bg-primary/5" : "bg-card"}`}
          >
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-semibold">
                {format(new Date(a.scheduled_at), "HH:mm")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.dog?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{a.dog?.tutor?.full_name}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
            {a.groomer?.full_name ? (
              <p className="mt-2 text-xs text-muted-foreground">{a.groomer.full_name}</p>
            ) : null}
          </button>
        ))
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Appt["status"] }) {
  const map: Record<Appt["status"], { label: string; variant?: any }> = {
    scheduled: { label: "Agendado", variant: "outline" },
    in_progress: { label: "Em execução" },
    done: { label: "Concluído", variant: "secondary" },
    cancelled: { label: "Cancelado", variant: "destructive" },
    no_show: { label: "Não compareceu", variant: "destructive" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function ApptSheet({
  open,
  appt,
  onClose,
  onDone,
}: {
  open: boolean;
  appt: Appt | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = appt !== null;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [dogId, setDogId] = useState<string | null>(null);
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState("60");
  const [groomerId, setGroomerId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [pickedServices, setPickedServices] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const servicesQuery = useQuery({
    queryKey: ["grooming-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grooming_services").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
    enabled: open,
  });

  const dogsQuery = useQuery({
    queryKey: ["dogs-pick"],
    queryFn: async () => {
      const { data } = await supabase.from("dogs").select("id,name,tutor:tutors(full_name)").order("name");
      return data ?? [];
    },
    enabled: open && !isEdit,
  });

  const profilesQuery = useQuery({
    queryKey: ["profiles-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name").order("full_name");
      return data ?? [];
    },
    enabled: open,
  });

  const appliedServicesQuery = useQuery({
    queryKey: ["appt-services", appt?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("grooming_appointment_services")
        .select("id,service_id,price")
        .eq("appointment_id", appt!.id);
      return data ?? [];
    },
    enabled: open && isEdit,
  });

  useMemo(() => {
    if (!open) return;
    if (appt) {
      setDogId(appt.dog_id);
      setWhen(toLocalInput(appt.scheduled_at));
      setDuration(String(appt.duration_min));
      setGroomerId(appt.groomer_id ?? "");
      setNotes(appt.notes ?? "");
    } else {
      setDogId(null);
      setWhen("");
      setDuration("60");
      setGroomerId("");
      setNotes("");
      setPickedServices({});
      setSearch("");
    }
  }, [open, appt?.id]);

  useMemo(() => {
    if (appliedServicesQuery.data) {
      const m: Record<string, number> = {};
      for (const s of appliedServicesQuery.data) m[s.service_id] = Number(s.price);
      setPickedServices(m);
    }
  }, [appliedServicesQuery.data]);

  const filteredDogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = (dogsQuery.data ?? []) as any[];
    if (!q) return all.slice(0, 15);
    return all.filter((d) => [d.name, d.tutor?.full_name].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [dogsQuery.data, search]);

  const total = Object.values(pickedServices).reduce((s, v) => s + (v || 0), 0);

  async function handleSave() {
    if (!dogId) return toast.error("Selecione um cão.");
    if (!when) return toast.error("Defina o horário.");
    setSaving(true);
    try {
      let apptId = appt?.id;
      const payload = {
        dog_id: dogId,
        scheduled_at: new Date(when).toISOString(),
        duration_min: parseInt(duration) || 60,
        groomer_id: groomerId || null,
        notes: notes.trim() || null,
        total_price: total,
      };
      if (isEdit && apptId) {
        const { error } = await supabase.from("grooming_appointments").update(payload).eq("id", apptId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("grooming_appointments")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        apptId = data.id;
      }
      // sync services
      if (apptId) {
        await supabase.from("grooming_appointment_services").delete().eq("appointment_id", apptId);
        const rows = Object.entries(pickedServices).map(([service_id, price]) => ({
          appointment_id: apptId!,
          service_id,
          price,
        }));
        if (rows.length) {
          const { error } = await supabase.from("grooming_appointment_services").insert(rows);
          if (error) throw error;
        }
      }
      toast.success("Agendamento salvo.");
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: Appt["status"]) {
    if (!appt) return;
    const patch: any = { status };
    if (status === "in_progress" && !appt.started_at) patch.started_at = new Date().toISOString();
    if (status === "done") patch.finished_at = new Date().toISOString();
    const { error } = await supabase.from("grooming_appointments").update(patch).eq("id", appt.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado.");
    onDone();
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? `Atendimento · ${appt?.dog?.name}` : "Novo agendamento"}</SheetTitle>
          <SheetDescription>Selecione cão, serviços, profissional e horário.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="geral" className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="fotos" disabled={!isEdit}>Fotos antes/depois</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 pt-4">
            {!isEdit ? (
              <div>
                <Label>Cão</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar cão" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border">
                  {filteredDogs.map((d: any) => (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => setDogId(d.id)}
                      className={`flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50 ${dogId === d.id ? "bg-primary/10" : ""}`}
                    >
                      <span>
                        <strong>{d.name}</strong>
                        {d.tutor?.full_name ? <span className="text-muted-foreground"> · {d.tutor.full_name}</span> : null}
                      </span>
                      {dogId === d.id ? <Badge>Selecionado</Badge> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Data e hora *</Label>
                <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Profissional</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={groomerId}
                  onChange={(e) => setGroomerId(e.target.value)}
                >
                  <option value="">— sem responsável —</option>
                  {(profilesQuery.data ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.full_name ?? "Sem nome"}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Serviços</Label>
              <div className="mt-2 space-y-2">
                {(servicesQuery.data ?? []).map((s) => {
                  const checked = s.id in pickedServices;
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setPickedServices((prev) => {
                            const next = { ...prev };
                            if (v) next[s.id] = Number(s.base_price);
                            else delete next[s.id];
                            return next;
                          });
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.duration_min} min</p>
                      </div>
                      {checked ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={pickedServices[s.id]}
                          onChange={(e) => setPickedServices((p) => ({ ...p, [s.id]: Number(e.target.value) }))}
                          className="w-24"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{brl(Number(s.base_price))}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-right text-sm font-semibold">Total: {brl(total)}</p>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {isEdit ? (
              <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-border p-3">
                {appt!.status === "scheduled" ? (
                  <Button size="sm" onClick={() => updateStatus("in_progress")}>
                    <Play className="mr-1 h-4 w-4" /> Iniciar
                  </Button>
                ) : null}
                {appt!.status === "in_progress" ? (
                  <Button size="sm" onClick={() => updateStatus("done")}>
                    <Check className="mr-1 h-4 w-4" /> Concluir
                  </Button>
                ) : null}
                {appt!.status !== "done" && appt!.status !== "cancelled" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => updateStatus("no_show")}>Não compareceu</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus("cancelled")}>
                      <X className="mr-1 h-4 w-4" /> Cancelar
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </TabsContent>

          {isEdit && appt ? (
            <TabsContent value="fotos" className="pt-4">
              <PhotosSection appointmentId={appt.id} />
            </TabsContent>
          ) : null}
        </Tabs>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function PhotosSection({ appointmentId }: { appointmentId: string }) {
  const qc = useQueryClient();
  const photosQuery = useQuery({
    queryKey: ["photos", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grooming_photos")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      if (error) throw error;
      const photos = data ?? [];
      const signed = await Promise.all(
        photos.map(async (p) => {
          const { data: url } = await supabase.storage.from("grooming").createSignedUrl(p.storage_path, 3600);
          return { ...p, url: url?.signedUrl ?? null };
        }),
      );
      return signed;
    },
  });

  async function upload(file: File, moment: "before" | "after") {
    const invalid = validateFile(file, { maxSizeMB: 5, allowedTypes: IMAGE_TYPES });
    if (invalid) return toast.error(invalid);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${appointmentId}/${moment}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("grooming").upload(path, file);
    if (error) return toast.error(error.message);
    const { data: userData } = await supabase.auth.getUser();
    const { error: e2 } = await supabase.from("grooming_photos").insert({
      appointment_id: appointmentId,
      storage_path: path,
      moment,
      uploaded_by: userData.user?.id ?? null,
    });
    if (e2) return toast.error(e2.message);
    toast.success("Foto enviada.");
    qc.invalidateQueries({ queryKey: ["photos", appointmentId] });
  }

  async function remove(id: string, path: string) {
    await supabase.storage.from("grooming").remove([path]);
    await supabase.from("grooming_photos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["photos", appointmentId] });
  }

  const before = (photosQuery.data ?? []).filter((p) => p.moment === "before");
  const after = (photosQuery.data ?? []).filter((p) => p.moment === "after");

  return (
    <div className="space-y-6">
      {(["before", "after"] as const).map((moment) => {
        const list = moment === "before" ? before : after;
        return (
          <div key={moment}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">
                {moment === "before" ? "Antes" : "Depois"}
              </h3>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f, moment);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
                  <Upload className="h-4 w-4" /> Enviar
                </span>
              </label>
            </div>
            {list.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                <Camera className="mx-auto mb-2 h-6 w-6" /> Nenhuma foto ainda.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {list.map((p: any) => (
                  <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                    {p.url ? <img src={p.url} alt="" className="h-full w-full object-cover" /> : null}
                    <button
                      onClick={() => remove(p.id, p.storage_path)}
                      className="absolute right-1 top-1 rounded-full bg-background/80 p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductivityPanel() {
  const [from, setFrom] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));

  const query = useQuery({
    queryKey: ["grooming-productivity", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grooming_appointments")
        .select("id,groomer_id,status,started_at,finished_at,total_price,groomer:profiles!grooming_appointments_groomer_id_fkey(full_name)")
        .gte("scheduled_at", new Date(from + "T00:00").toISOString())
        .lte("scheduled_at", new Date(to + "T23:59").toISOString())
        .eq("status", "done");
      if (error) throw error;

      const by = new Map<string, { name: string; count: number; minutes: number; revenue: number }>();
      for (const a of data ?? []) {
        const key = a.groomer_id ?? "sem";
        const name = (a as any).groomer?.full_name ?? "Sem responsável";
        const cur = by.get(key) ?? { name, count: 0, minutes: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += Number(a.total_price) || 0;
        if (a.started_at && a.finished_at) {
          cur.minutes += Math.max(
            0,
            (new Date(a.finished_at).getTime() - new Date(a.started_at).getTime()) / 60000,
          );
        }
        by.set(key, cur);
      }
      return Array.from(by.values()).sort((a, b) => b.count - a.count);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {query.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (query.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum atendimento concluído no período.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(query.data ?? []).map((r, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <p className="font-display text-lg font-semibold">{r.name}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Atendimentos</p><p className="font-semibold">{r.count}</p></div>
                <div><p className="text-xs text-muted-foreground">Tempo médio</p><p className="font-semibold">{r.count ? Math.round(r.minutes / r.count) : 0} min</p></div>
                <div><p className="text-xs text-muted-foreground">Faturamento</p><p className="font-semibold">{brl(r.revenue)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}
function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
