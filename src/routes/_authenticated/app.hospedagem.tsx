import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, BedDouble, Trash2, FileText, LogOut as LogOutIcon, Search } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/app/hospedagem")({
  head: () => ({ meta: [{ title: "Hospedagem — Quintal da Gabi" }] }),
  component: HospedagemPage,
});

type Stay = {
  id: string;
  dog_id: string;
  check_in_at: string;
  expected_check_out_at: string;
  check_out_at: string | null;
  kennel: string | null;
  daily_rate: number;
  notes: string | null;
  dog: { id: string; name: string; photo_url: string | null; tutor: { full_name: string } | null } | null;
};

function HospedagemPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"ativas" | "futuras" | "encerradas">("ativas");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Stay | null>(null);
  const [checkout, setCheckout] = useState<Stay | null>(null);

  const staysQuery = useQuery({
    queryKey: ["boarding-stays", filter],
    queryFn: async () => {
      let q = supabase
        .from("boarding_stays")
        .select(
          "id,dog_id,check_in_at,expected_check_out_at,check_out_at,kennel,daily_rate,notes,dog:dogs(id,name,photo_url,tutor:tutors(full_name))",
        );
      const nowIso = new Date().toISOString();
      if (filter === "ativas") {
        q = q.is("check_out_at", null).lte("check_in_at", nowIso);
      } else if (filter === "futuras") {
        q = q.is("check_out_at", null).gt("check_in_at", nowIso);
      } else {
        q = q.not("check_out_at", "is", null);
      }
      const { data, error } = await q.order("check_in_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Stay[];
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["unit-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("unit_settings").select("boarding_capacity").limit(1).maybeSingle();
      return data;
    },
  });

  const activeQuery = useQuery({
    queryKey: ["boarding-active-count"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { count } = await supabase
        .from("boarding_stays")
        .select("id", { count: "exact", head: true })
        .is("check_out_at", null)
        .lte("check_in_at", nowIso);
      return count ?? 0;
    },
  });

  const stays = staysQuery.data ?? [];
  const capacidade = settingsQuery.data?.boarding_capacity ?? 10;
  const ocupados = activeQuery.data ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Hospedagem</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reservas, controle de ocupação e relatório por estadia.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova hospedagem
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel label="Ocupados agora" value={String(ocupados)} tone="primary" />
        <Panel label="Capacidade" value={String(capacidade)} />
        <Panel label="Vagas livres" value={String(Math.max(0, capacidade - ocupados))} />
        <Panel
          label="Ocupação"
          value={`${capacidade > 0 ? Math.round((ocupados / capacidade) * 100) : 0}%`}
        />
      </div>

      <div className="flex gap-2">
        {(["ativas", "futuras", "encerradas"] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? "default" : "outline"}
            onClick={() => setFilter(k)}
          >
            {k === "ativas" ? "Ativas" : k === "futuras" ? "Futuras" : "Encerradas"}
          </Button>
        ))}
      </div>

      {staysQuery.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : stays.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Nenhuma hospedagem nesta lista.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {stays.map((s) => (
            <StayCard
              key={s.id}
              stay={s}
              onOpen={() => setEditing(s)}
              onCheckout={!s.check_out_at ? () => setCheckout(s) : undefined}
            />
          ))}
        </div>
      )}

      <StaySheet
        open={creating || editing !== null}
        stay={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["boarding-stays"] });
          qc.invalidateQueries({ queryKey: ["boarding-active-count"] });
        }}
      />

      <CheckoutDialog
        stay={checkout}
        onClose={() => setCheckout(null)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["boarding-stays"] });
          qc.invalidateQueries({ queryKey: ["boarding-active-count"] });
        }}
      />
    </div>
  );
}

function Panel({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className={`rounded-2xl border border-border p-5 ${tone === "primary" ? "bg-primary/5" : "bg-card"}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
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
  const start = new Date(stay.check_in_at);
  const expected = new Date(stay.expected_check_out_at);
  const end = stay.check_out_at ? new Date(stay.check_out_at) : null;
  const today = new Date();
  const remaining = end ? 0 : Math.max(0, differenceInCalendarDays(expected, today));
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        {stay.dog?.photo_url ? (
          <img src={stay.dog.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <BedDouble className="h-10 w-10 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">{stay.dog?.name ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">{stay.dog?.tutor?.full_name ?? ""}</p>
        </div>
        {end ? <Badge variant="secondary">Encerrada</Badge> : <Badge>Ativa</Badge>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Entrada</p>
          {format(start, "dd/MM HH:mm", { locale: ptBR })}
        </div>
        <div>
          <p className="font-medium text-foreground">{end ? "Saída" : "Saída prevista"}</p>
          {format(end ?? expected, "dd/MM HH:mm", { locale: ptBR })}
        </div>
        {stay.kennel ? (
          <div>
            <p className="font-medium text-foreground">Baia</p>
            {stay.kennel}
          </div>
        ) : null}
        {!end ? (
          <div>
            <p className="font-medium text-foreground">Restam</p>
            {remaining} dia{remaining === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onOpen} className="flex-1">
          Detalhes
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/app/hospedagem/$id/relatorio" params={{ id: stay.id }} target="_blank">
            <FileText className="mr-1 h-4 w-4" /> Relatório
          </Link>
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

function CheckoutDialog({
  stay,
  onClose,
  onDone,
}: {
  stay: Stay | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [when, setWhen] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!stay) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("boarding_stays")
        .update({
          check_out_at: when ? new Date(when).toISOString() : new Date().toISOString(),
          check_out_by: userData.user?.id ?? null,
        })
        .eq("id", stay.id);
      if (error) throw error;
      toast.success("Hospedagem encerrada. Gere o relatório.");
      onDone();
      onClose();
      setWhen("");
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
          <DialogDescription>Confirme a saída efetiva. Em branco usa o horário atual.</DialogDescription>
        </DialogHeader>
        <div>
          <Label>Data e hora da saída</Label>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Encerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaySheet({
  open,
  stay,
  onClose,
  onDone,
}: {
  open: boolean;
  stay: Stay | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const effectiveStayId = stay?.id ?? createdId;
  const isEdit = effectiveStayId !== null;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dogId, setDogId] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [expected, setExpected] = useState("");
  const [kennel, setKennel] = useState("");
  const [rate, setRate] = useState("");
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
    enabled: open && !isEdit,
  });

  // Pré-preencher quando edita
  useMemo(() => {
    if (open && stay) {
      setCreatedId(null);
      setDogId(stay.dog_id);
      setCheckIn(toLocalInput(stay.check_in_at));
      setExpected(toLocalInput(stay.expected_check_out_at));
      setKennel(stay.kennel ?? "");
      setRate(String(stay.daily_rate ?? ""));
      setNotes(stay.notes ?? "");
    } else if (open && !stay) {
      setCreatedId(null);
      setDogId(null);
      setCheckIn("");
      setExpected("");
      setKennel("");
      setRate("");
      setNotes("");
      setSearch("");
    }
  }, [open, stay?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = (dogsQuery.data ?? []) as Array<{ id: string; name: string; tutor: { full_name: string } | null }>;
    if (!q) return all.slice(0, 15);
    return all.filter((d) =>
      [d.name, d.tutor?.full_name].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  }, [dogsQuery.data, search]);

  async function handleSave() {
    if (!dogId) return toast.error("Selecione um cão.");
    if (!checkIn || !expected) return toast.error("Datas de entrada e saída prevista são obrigatórias.");
    setSaving(true);
    try {
      const payload = {
        dog_id: dogId,
        check_in_at: new Date(checkIn).toISOString(),
        expected_check_out_at: new Date(expected).toISOString(),
        kennel: kennel.trim() || null,
        daily_rate: rate ? Number(rate) : 0,
        notes: notes.trim() || null,
      };
      if (isEdit && effectiveStayId) {
        const { error } = await supabase.from("boarding_stays").update(payload).eq("id", effectiveStayId);
        if (error) throw error;
        toast.success("Hospedagem atualizada.");
        onDone();
      } else {
        // Verifica estadia anterior em aberto para esse cão
        const { data: existing } = await supabase
          .from("boarding_stays")
          .select("id, check_in_at")
          .eq("dog_id", dogId)
          .is("check_out_at", null)
          .maybeSingle();
        const { data: userData } = await supabase.auth.getUser();
        if (existing) {
          const when = new Date(existing.check_in_at).toLocaleString("pt-BR");
          const ok = window.confirm(
            `Existe uma hospedagem em aberto desde ${when}. Deseja encerrá-la agora e iniciar uma nova?`,
          );
          if (!ok) { setSaving(false); return; }
          const { error: closeErr } = await supabase
            .from("boarding_stays")
            .update({ check_out_at: new Date().toISOString(), check_out_by: userData.user?.id ?? null })
            .eq("id", existing.id);
          if (closeErr) throw closeErr;
        }
        const { data: inserted, error } = await supabase
          .from("boarding_stays")
          .insert({ ...payload, check_in_by: userData.user?.id ?? null })
          .select("id")
          .single();
        if (error) throw error;
        setCreatedId(inserted.id);
        toast.success("Hospedagem criada. Agora você pode preencher ração, medicamentos, pertences e diário.");
        onDone();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? `Hospedagem de ${stay?.dog?.name}` : "Nova hospedagem"}</SheetTitle>
          <SheetDescription>Dados gerais, ração, medicamentos, pertences e diário.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="geral" className="mt-4">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="racao" disabled={!isEdit} title={!isEdit ? "Salve a hospedagem primeiro" : undefined}>Ração</TabsTrigger>
            <TabsTrigger value="meds" disabled={!isEdit} title={!isEdit ? "Salve a hospedagem primeiro" : undefined}>Medicamentos</TabsTrigger>
            <TabsTrigger value="pert" disabled={!isEdit} title={!isEdit ? "Salve a hospedagem primeiro" : undefined}>Pertences</TabsTrigger>
            <TabsTrigger value="diario" disabled={!isEdit} title={!isEdit ? "Salve a hospedagem primeiro" : undefined}>Diário</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 pt-4">
            {!isEdit ? (
              <div className="space-y-2">
                <Label>Cão</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cão"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
                  {filtered.map((d) => (
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
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Entrada *</Label>
                <Input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div>
                <Label>Saída prevista *</Label>
                <Input type="datetime-local" value={expected} onChange={(e) => setExpected(e.target.value)} />
              </div>
              <div>
                <Label>Baia / canil</Label>
                <Input value={kennel} onChange={(e) => setKennel(e.target.value)} />
              </div>
              <div>
                <Label>Diária (R$)</Label>
                <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {isEdit && effectiveStayId ? (
            <>
              <TabsContent value="racao" className="pt-4">
                <FoodSection stayId={effectiveStayId} />
              </TabsContent>
              <TabsContent value="meds" className="pt-4">
                <BoardingMedsSection stayId={effectiveStayId} />
              </TabsContent>
              <TabsContent value="pert" className="pt-4">
                <BelongingsSection stayId={effectiveStayId} />
              </TabsContent>
              <TabsContent value="diario" className="pt-4">
                <DailyLogSection stayId={effectiveStayId} />
              </TabsContent>
            </>
          ) : null}
        </Tabs>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Salvar" : "Criar hospedagem"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

// ------- Sections inside detail -------

function FoodSection({ stayId }: { stayId: string }) {
  const qc = useQueryClient();
  const [source, setSource] = useState("propria");
  const [brand, setBrand] = useState("");
  const [total, setTotal] = useState("");
  const [portion, setPortion] = useState("");
  const [meals, setMeals] = useState("");
  const [notes, setNotes] = useState("");

  const query = useQuery({
    queryKey: ["bfood", stayId],
    queryFn: async () => {
      const { data, error } = await supabase.from("boarding_food").select("*").eq("stay_id", stayId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("boarding_food").insert({
        stay_id: stayId,
        source,
        brand: brand.trim() || null,
        total_amount_g: total ? parseInt(total) : null,
        portion_g: portion ? parseInt(portion) : null,
        meals_per_day: meals ? parseInt(meals) : null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ração registrada.");
      setBrand(""); setTotal(""); setPortion(""); setMeals(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["bfood", stayId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boarding_food").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bfood", stayId] }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Origem</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="propria">Trazida pelo tutor</option>
              <option value="casa">Da casa (Quintal)</option>
            </select>
          </div>
          <div>
            <Label>Marca</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div>
            <Label>Quantidade total (g)</Label>
            <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} />
          </div>
          <div>
            <Label>Porção (g)</Label>
            <Input type="number" value={portion} onChange={(e) => setPortion(e.target.value)} />
          </div>
          <div>
            <Label>Refeições por dia</Label>
            <Input type="number" value={meals} onChange={(e) => setMeals(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observação</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Button className="mt-3" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>
      <ul className="space-y-2">
        {(query.data ?? []).map((f) => (
          <li key={f.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex-1 text-sm">
              <p className="font-medium">{f.brand ?? "Sem marca"} · {f.source === "propria" ? "Trazida" : "Da casa"}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  f.portion_g ? `${f.portion_g}g/porção` : null,
                  f.meals_per_day ? `${f.meals_per_day}x/dia` : null,
                  f.total_amount_g ? `total ${f.total_amount_g}g` : null,
                  f.notes,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => delMut.mutate(f.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BoardingMedsSection({ stayId }: { stayId: string }) {
  const qc = useQueryClient();
  const [med, setMed] = useState("");
  const [dose, setDose] = useState("");
  const [freq, setFreq] = useState("");
  const [sched, setSched] = useState("");

  const query = useQuery({
    queryKey: ["bmeds", stayId],
    queryFn: async () => {
      const { data, error } = await supabase.from("boarding_medications").select("*").eq("stay_id", stayId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!med.trim()) throw new Error("Informe o medicamento.");
      const { error } = await supabase.from("boarding_medications").insert({
        stay_id: stayId,
        medication: med.trim(),
        dose: dose.trim() || null,
        frequency: freq.trim() || null,
        schedule: sched.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medicamento registrado.");
      setMed(""); setDose(""); setFreq(""); setSched("");
      qc.invalidateQueries({ queryKey: ["bmeds", stayId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boarding_medications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bmeds", stayId] }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Medicamento *</Label><Input value={med} onChange={(e) => setMed(e.target.value)} /></div>
          <div><Label>Dose</Label><Input value={dose} onChange={(e) => setDose(e.target.value)} /></div>
          <div><Label>Frequência</Label><Input value={freq} onChange={(e) => setFreq(e.target.value)} placeholder="Ex: 12/12h" /></div>
          <div><Label>Horários</Label><Input value={sched} onChange={(e) => setSched(e.target.value)} placeholder="Ex: 08h, 20h" /></div>
        </div>
        <Button className="mt-3" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>
      <ul className="space-y-2">
        {(query.data ?? []).map((m) => (
          <li key={m.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-sm">
            <div className="flex-1">
              <p className="font-medium">{m.medication} {m.dose ? `(${m.dose})` : ""}</p>
              <p className="text-xs text-muted-foreground">{[m.frequency, m.schedule].filter(Boolean).join(" · ")}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => delMut.mutate(m.id)}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BelongingsSection({ stayId }: { stayId: string }) {
  const qc = useQueryClient();
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");

  const query = useQuery({
    queryKey: ["bel", stayId],
    queryFn: async () => {
      const { data, error } = await supabase.from("boarding_belongings").select("*").eq("stay_id", stayId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!item.trim()) throw new Error("Informe o item.");
      const { error } = await supabase.from("boarding_belongings").insert({
        stay_id: stayId,
        item: item.trim(),
        quantity: parseInt(qty) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setItem(""); setQty("1");
      qc.invalidateQueries({ queryKey: ["bel", stayId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updMut = useMutation({
    mutationFn: async ({ id, returned }: { id: string; returned: boolean }) => {
      const { error } = await supabase.from("boarding_belongings").update({ returned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bel", stayId] }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boarding_belongings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bel", stayId] }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <div><Label>Item *</Label><Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Coleira, brinquedo, cama…" /></div>
          <div><Label>Qtde</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        </div>
        <Button className="mt-3" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>
      <ul className="space-y-2">
        {(query.data ?? []).map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
            <Checkbox
              checked={b.returned}
              onCheckedChange={(v) => updMut.mutate({ id: b.id, returned: !!v })}
            />
            <div className="flex-1">
              <p className={b.returned ? "line-through text-muted-foreground" : "font-medium"}>
                {b.item} <span className="text-xs text-muted-foreground">x{b.quantity}</span>
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => delMut.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DailyLogSection({ stayId }: { stayId: string }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fedOk, setFedOk] = useState(true);
  const [medOk, setMedOk] = useState(true);
  const [mood, setMood] = useState("");
  const [notes, setNotes] = useState("");

  const query = useQuery({
    queryKey: ["blogs", stayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_daily_logs")
        .select("*")
        .eq("stay_id", stayId)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("boarding_daily_logs")
        .upsert(
          {
            stay_id: stayId,
            log_date: date,
            fed_ok: fedOk,
            medication_ok: medOk,
            mood: mood.trim() || null,
            notes: notes.trim() || null,
            recorded_by: userData.user?.id ?? null,
          },
          { onConflict: "stay_id,log_date" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diário registrado.");
      setMood(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["blogs", stayId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Humor</Label><Input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Calmo, agitado…" /></div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={fedOk} onCheckedChange={(v) => setFedOk(!!v)} /> Comeu OK
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={medOk} onCheckedChange={(v) => setMedOk(!!v)} /> Medicação OK
            </label>
          </div>
        </div>
        <div className="mt-3"><Label>Observações</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <Button className="mt-3" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Registrar dia
        </Button>
      </div>
      <ul className="space-y-2">
        {(query.data ?? []).map((l) => (
          <li key={l.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="font-medium">{format(new Date(l.log_date + "T00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>
            <p className="text-xs text-muted-foreground">
              {l.fed_ok ? "✅ alimentação" : "⚠️ alimentação"} · {l.medication_ok ? "✅ medicação" : "⚠️ medicação"}
              {l.mood ? ` · humor: ${l.mood}` : ""}
            </p>
            {l.notes ? <p className="mt-1">{l.notes}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
