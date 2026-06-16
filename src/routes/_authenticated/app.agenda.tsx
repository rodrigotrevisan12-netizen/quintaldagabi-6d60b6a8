import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LogIn,
  LogOut as LogOutIcon,
  Loader2,
  Search,
  Utensils,
  Pill,
  Activity,
  Clock,
  Trash2,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  head: () => ({ meta: [{ title: "Creche — Quintal da Gabi" }] }),
  component: CrechePage,
});

type DogLite = {
  id: string;
  name: string;
  photo_url: string | null;
  tutor: { full_name: string } | null;
};

type Stay = {
  id: string;
  dog_id: string;
  check_in_at: string;
  check_out_at: string | null;
  drop_off_person: string | null;
  pickup_person: string | null;
  notes: string | null;
  dog: DogLite | null;
};

function CrechePage() {
  const qc = useQueryClient();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [activeStay, setActiveStay] = useState<Stay | null>(null);
  const [checkoutStay, setCheckoutStay] = useState<Stay | null>(null);

  const staysQuery = useQuery({
    queryKey: ["daycare-today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("daycare_stays")
        .select(
          "id,dog_id,check_in_at,check_out_at,drop_off_person,pickup_person,notes,dog:dogs(id,name,photo_url,tutor:tutors(full_name))",
        )
        .gte("check_in_at", today.toISOString())
        .order("check_in_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Stay[];
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["unit-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("unit_settings").select("daycare_capacity").limit(1).maybeSingle();
      return data;
    },
  });

  const stays = staysQuery.data ?? [];
  const presentes = stays.filter((s) => !s.check_out_at);
  const finalizadas = stays.filter((s) => s.check_out_at);
  const capacidade = settingsQuery.data?.daycare_capacity ?? 20;
  const vagas = Math.max(0, capacidade - presentes.length);
  const utilizacao = capacidade > 0 ? Math.round((presentes.length / capacidade) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Creche</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle de presença, alimentação, medicação e atividades do dia.
          </p>
        </div>
        <Button onClick={() => setCheckInOpen(true)}>
          <LogIn className="mr-1 h-4 w-4" /> Check-in
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel label="Presentes" value={String(presentes.length)} tone="primary" />
        <Panel label="Saíram hoje" value={String(finalizadas.length)} />
        <Panel label="Vagas disponíveis" value={String(vagas)} />
        <Panel label="Capacidade utilizada" value={`${utilizacao}%`} hint={`${presentes.length} / ${capacidade}`} />
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Presentes agora</h2>
        {staysQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : presentes.length === 0 ? (
          <Empty text="Nenhum cão na creche agora. Clique em Check-in para registrar a chegada." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {presentes.map((s) => (
              <StayCard
                key={s.id}
                stay={s}
                onOpen={() => setActiveStay(s)}
                onCheckout={() => setCheckoutStay(s)}
              />
            ))}
          </div>
        )}
      </div>

      {finalizadas.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Saíram hoje</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {finalizadas.map((s) => (
              <StayCard key={s.id} stay={s} onOpen={() => setActiveStay(s)} />
            ))}
          </div>
        </div>
      ) : null}

      <CheckInDialog
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ["daycare-today"] })}
      />

      <CheckoutDialog
        stay={checkoutStay}
        onClose={() => setCheckoutStay(null)}
        onDone={() => qc.invalidateQueries({ queryKey: ["daycare-today"] })}
      />

      <StaySheet
        stay={activeStay}
        onClose={() => setActiveStay(null)}
      />
    </div>
  );
}

function Panel({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "primary" }) {
  return (
    <div className={`rounded-2xl border border-border p-5 ${tone === "primary" ? "bg-primary/5" : "bg-card"}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function StayCard({
  stay,
  onOpen,
  onCheckout,
}: {
  stay: Stay;
  onOpen: () => void;
  onCheckout?: () => void;
}) {
  const tutorName = stay.dog?.tutor?.full_name;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        {stay.dog?.photo_url ? (
          <img src={stay.dog.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            🐕
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">{stay.dog?.name ?? "—"}</p>
          {tutorName ? <p className="truncate text-xs text-muted-foreground">{tutorName}</p> : null}
        </div>
        {stay.check_out_at ? (
          <Badge variant="secondary">Saiu</Badge>
        ) : (
          <Badge>Presente</Badge>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        Entrou {format(new Date(stay.check_in_at), "HH:mm")}
        {stay.check_out_at ? ` · Saiu ${format(new Date(stay.check_out_at), "HH:mm")}` : ""}
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={onOpen} className="flex-1">
          Registros
        </Button>
        {onCheckout ? (
          <Button size="sm" onClick={onCheckout}>
            <LogOutIcon className="mr-1 h-4 w-4" /> Check-out
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function CheckInDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState("");
  const [dogId, setDogId] = useState<string | null>(null);
  const [dropOff, setDropOff] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const dogsQuery = useQuery({
    queryKey: ["dogs-pick"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dogs")
        .select("id,name,tutor:tutors(full_name)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = (dogsQuery.data ?? []) as Array<{ id: string; name: string; tutor: { full_name: string } | null }>;
    if (!q) return all.slice(0, 20);
    return all.filter((d) =>
      [d.name, d.tutor?.full_name].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  }, [dogsQuery.data, search]);

  async function handleSave() {
    if (!dogId) {
      toast.error("Selecione um cão.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("daycare_stays").insert({
        dog_id: dogId,
        drop_off_person: dropOff.trim() || null,
        notes: notes.trim() || null,
        check_in_by: userData.user?.id ?? null,
      });
      if (error) {
        if (error.message.includes("uniq_daycare_stay_open")) {
          throw new Error("Este cão já tem uma estadia aberta.");
        }
        throw error;
      }
      toast.success("Check-in registrado.");
      onDone();
      onClose();
      setDogId(null);
      setSearch("");
      setDropOff("");
      setNotes("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Check-in de creche</DialogTitle>
          <DialogDescription>Selecione o cão e registre a chegada.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cão por nome ou tutor"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum cão encontrado.</p>
            ) : (
              filtered.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => setDogId(d.id)}
                  className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50 ${dogId === d.id ? "bg-primary/10" : ""}`}
                >
                  <span>
                    <strong>{d.name}</strong>
                    {d.tutor?.full_name ? (
                      <span className="text-muted-foreground"> · {d.tutor.full_name}</span>
                    ) : null}
                  </span>
                  {dogId === d.id ? <Badge>Selecionado</Badge> : null}
                </button>
              ))
            )}
          </div>
          <div>
            <Label>Pessoa que trouxe</Label>
            <Input value={dropOff} onChange={(e) => setDropOff(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutDialog({
  stay,
  onClose,
  onDone,
}: {
  stay: Stay | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pickup, setPickup] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!stay) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("daycare_stays")
        .update({
          check_out_at: new Date().toISOString(),
          check_out_by: userData.user?.id ?? null,
          pickup_person: pickup.trim() || null,
        })
        .eq("id", stay.id);
      if (error) throw error;
      toast.success("Check-out registrado.");
      onDone();
      onClose();
      setPickup("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={stay !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check-out · {stay?.dog?.name}</DialogTitle>
          <DialogDescription>Confirme a saída e quem está retirando.</DialogDescription>
        </DialogHeader>
        <div>
          <Label>Pessoa que retirou</Label>
          <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Nome de quem retira" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Confirmar saída
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaySheet({ stay, onClose }: { stay: Stay | null; onClose: () => void }) {
  return (
    <Sheet open={stay !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {stay ? (
          <>
            <SheetHeader>
              <SheetTitle>{stay.dog?.name}</SheetTitle>
              <SheetDescription>
                {stay.dog?.tutor?.full_name ?? ""} · entrou {format(new Date(stay.check_in_at), "dd/MM HH:mm", { locale: ptBR })}
              </SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="feedings" className="mt-4">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="feedings"><Utensils className="mr-1 h-3 w-3" />Alimentação</TabsTrigger>
                <TabsTrigger value="meds"><Pill className="mr-1 h-3 w-3" />Medicação</TabsTrigger>
                <TabsTrigger value="acts"><Activity className="mr-1 h-3 w-3" />Atividades</TabsTrigger>
              </TabsList>
              <TabsContent value="feedings">
                <FeedingsTab stayId={stay.id} />
              </TabsContent>
              <TabsContent value="meds">
                <MedsTab stayId={stay.id} />
              </TabsContent>
              <TabsContent value="acts">
                <ActsTab stayId={stay.id} />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function FeedingsTab({ stayId }: { stayId: string }) {
  const qc = useQueryClient();
  const [type, setType] = useState<string>("racao");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const query = useQuery({
    queryKey: ["feedings", stayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daycare_feedings")
        .select("*")
        .eq("stay_id", stayId)
        .order("fed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("daycare_feedings").insert({
        stay_id: stayId,
        feeding_type: type as any,
        amount: amount.trim() || null,
        notes: notes.trim() || null,
        recorded_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alimentação registrada.");
      setAmount("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["feedings", stayId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daycare_feedings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedings", stayId] }),
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="racao">Ração</SelectItem>
                <SelectItem value="petisco">Petisco</SelectItem>
                <SelectItem value="umida">Comida úmida</SelectItem>
                <SelectItem value="agua">Água</SelectItem>
                <SelectItem value="outra">Outra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 1 xícara, 200g" />
          </div>
        </div>
        <div className="mt-3">
          <Label>Observação</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button className="mt-3" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>

      <Timeline
        loading={query.isLoading}
        items={(query.data ?? []).map((f) => ({
          id: f.id,
          time: f.fed_at,
          title: labelFeeding(f.feeding_type),
          subtitle: [f.amount, f.notes].filter(Boolean).join(" · "),
        }))}
        onDelete={(id) => delMut.mutate(id)}
      />
    </div>
  );
}

function MedsTab({ stayId }: { stayId: string }) {
  const qc = useQueryClient();
  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");
  const [notes, setNotes] = useState("");

  const query = useQuery({
    queryKey: ["meds", stayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daycare_medications")
        .select("*")
        .eq("stay_id", stayId)
        .order("given_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!medication.trim()) throw new Error("Informe o medicamento.");
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("daycare_medications").insert({
        stay_id: stayId,
        medication: medication.trim(),
        dose: dose.trim() || null,
        notes: notes.trim() || null,
        recorded_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medicação registrada.");
      setMedication("");
      setDose("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["meds", stayId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daycare_medications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meds", stayId] }),
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Medicamento</Label>
            <Input value={medication} onChange={(e) => setMedication(e.target.value)} />
          </div>
          <div>
            <Label>Dose</Label>
            <Input value={dose} onChange={(e) => setDose(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <Label>Observação</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button className="mt-3" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>

      <Timeline
        loading={query.isLoading}
        items={(query.data ?? []).map((m) => ({
          id: m.id,
          time: m.given_at,
          title: `${m.medication}${m.dose ? ` (${m.dose})` : ""}`,
          subtitle: m.notes ?? "",
        }))}
        onDelete={(id) => delMut.mutate(id)}
      />
    </div>
  );
}

function ActsTab({ stayId }: { stayId: string }) {
  const qc = useQueryClient();
  const [type, setType] = useState("brincadeira");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  const query = useQuery({
    queryKey: ["acts", stayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daycare_activities")
        .select("*")
        .eq("stay_id", stayId)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("daycare_activities").insert({
        stay_id: stayId,
        activity_type: type as any,
        duration_min: duration ? parseInt(duration, 10) : null,
        notes: notes.trim() || null,
        recorded_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atividade registrada.");
      setDuration("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["acts", stayId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daycare_activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["acts", stayId] }),
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <div>
            <Label>Atividade</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="passeio">Passeio</SelectItem>
                <SelectItem value="brincadeira">Brincadeira</SelectItem>
                <SelectItem value="soneca">Soneca</SelectItem>
                <SelectItem value="socializacao">Socialização</SelectItem>
                <SelectItem value="treino">Treino</SelectItem>
                <SelectItem value="outra">Outra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <Label>Observação</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button className="mt-3" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>

      <Timeline
        loading={query.isLoading}
        items={(query.data ?? []).map((a) => ({
          id: a.id,
          time: a.performed_at,
          title: labelActivity(a.activity_type),
          subtitle: [a.duration_min ? `${a.duration_min} min` : null, a.notes].filter(Boolean).join(" · "),
        }))}
        onDelete={(id) => delMut.mutate(id)}
      />
    </div>
  );
}

function Timeline({
  loading,
  items,
  onDelete,
}: {
  loading: boolean;
  items: Array<{ id: string; time: string; title: string; subtitle: string }>;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-medium text-primary">
            {format(new Date(it.time), "HH:mm")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{it.title}</p>
            {it.subtitle ? <p className="text-xs text-muted-foreground">{it.subtitle}</p> : null}
          </div>
          <Button size="icon" variant="ghost" onClick={() => onDelete(it.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function labelFeeding(t: string) {
  return { racao: "Ração", petisco: "Petisco", umida: "Comida úmida", agua: "Água", outra: "Outra" }[t] ?? t;
}
function labelActivity(t: string) {
  return {
    passeio: "Passeio",
    brincadeira: "Brincadeira",
    soneca: "Soneca",
    socializacao: "Socialização",
    treino: "Treino",
    outra: "Outra",
  }[t] ?? t;
}
