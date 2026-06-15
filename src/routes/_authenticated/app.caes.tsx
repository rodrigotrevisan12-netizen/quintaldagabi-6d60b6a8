import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Dog as DogIcon, Upload, Loader2, History } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/caes")({
  head: () => ({ meta: [{ title: "Cães — Quintal da Gabi" }] }),
  component: CaesPage,
});

type DogSize = "mini" | "pequeno" | "medio" | "grande" | "gigante";
type DogSex = "macho" | "femea";
type Trait = "sociavel" | "dominante" | "medroso" | "reativo" | "agressivo" | "ansioso";

type Dog = {
  id: string;
  tutor_id: string;
  name: string;
  photo_url: string | null;
  breed: string | null;
  size: DogSize | null;
  weight_kg: number | null;
  sex: DogSex | null;
  neutered: boolean | null;
  birth_date: string | null;
  microchip: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  plan: string | null;
  notes: string | null;
  tutors?: { full_name: string } | null;
};

type Behavior = {
  dog_id: string;
  traits: Trait[];
  compat_small: boolean;
  compat_medium: boolean;
  compat_large: boolean;
  compat_males: boolean;
  compat_females: boolean;
  notes: string | null;
  updated_at: string;
};

const SIZE_LABEL: Record<DogSize, string> = {
  mini: "Mini",
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  gigante: "Gigante",
};

const TRAIT_LABEL: Record<Trait, string> = {
  sociavel: "Sociável",
  dominante: "Dominante",
  medroso: "Medroso",
  reativo: "Reativo",
  agressivo: "Agressivo",
  ansioso: "Ansioso",
};

const TRAITS: Trait[] = ["sociavel", "dominante", "medroso", "reativo", "agressivo", "ansioso"];

function CaesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [openSheet, setOpenSheet] = useState(false);
  const [editing, setEditing] = useState<Dog | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Dog | null>(null);

  const dogsQuery = useQuery({
    queryKey: ["dogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dogs")
        .select("*, tutors(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Dog[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return dogsQuery.data ?? [];
    return (dogsQuery.data ?? []).filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.breed?.toLowerCase().includes(s) ||
        d.tutors?.full_name?.toLowerCase().includes(s),
    );
  }, [search, dogsQuery.data]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cão removido.");
      qc.invalidateQueries({ queryKey: ["dogs"] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Cães</h1>
          <p className="text-sm text-muted-foreground">
            Prontuário completo: cadastro, saúde e comportamento.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpenSheet(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo cão
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, raça ou tutor..."
          className="pl-9"
        />
      </div>

      {dogsQuery.isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <DogIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum cão cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="group rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                  {d.photo_url ? (
                    <img src={d.photo_url} alt={d.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <DogIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.breed ?? "Sem raça"} · {d.size ? SIZE_LABEL[d.size] : "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Tutor: {d.tutors?.full_name ?? "—"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(d);
                    setOpenSheet(true);
                  }}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Abrir
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(d)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DogSheet
        open={openSheet}
        onOpenChange={(o) => {
          setOpenSheet(o);
          if (!o) setEditing(null);
        }}
        dog={editing}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Toda a ficha (saúde, comportamento, histórico) será apagada. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============== Sheet com tabs ============== */

function DogSheet({
  open,
  onOpenChange,
  dog,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dog: Dog | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{dog ? dog.name : "Novo cão"}</SheetTitle>
          <SheetDescription>
            {dog ? "Edite a ficha do cão." : "Cadastre um novo cão na unidade."}
          </SheetDescription>
        </SheetHeader>

        {dog ? (
          <Tabs defaultValue="geral" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="saude">Saúde</TabsTrigger>
              <TabsTrigger value="comportamento">Comportamento</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="geral" className="mt-4">
              <DogForm dog={dog} onSaved={() => onOpenChange(false)} />
            </TabsContent>
            <TabsContent value="saude" className="mt-4">
              <HealthTab dogId={dog.id} />
            </TabsContent>
            <TabsContent value="comportamento" className="mt-4">
              <BehaviorTab dogId={dog.id} />
            </TabsContent>
            <TabsContent value="historico" className="mt-4">
              <BehaviorHistory dogId={dog.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="mt-4">
            <DogForm dog={null} onSaved={() => onOpenChange(false)} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ============== Form Geral ============== */

function DogForm({ dog, onSaved }: { dog: Dog | null; onSaved: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    tutor_id: dog?.tutor_id ?? "",
    name: dog?.name ?? "",
    breed: dog?.breed ?? "",
    size: (dog?.size ?? "") as DogSize | "",
    weight_kg: dog?.weight_kg?.toString() ?? "",
    sex: (dog?.sex ?? "") as DogSex | "",
    neutered: dog?.neutered ?? false,
    birth_date: dog?.birth_date ?? "",
    microchip: dog?.microchip ?? "",
    vet_name: dog?.vet_name ?? "",
    vet_phone: dog?.vet_phone ?? "",
    plan: dog?.plan ?? "",
    notes: dog?.notes ?? "",
    photo_url: dog?.photo_url ?? "",
  });
  const [uploading, setUploading] = useState(false);

  const tutorsQuery = useQuery({
    queryKey: ["tutors-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutors")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome é obrigatório.");
      if (!form.tutor_id) throw new Error("Selecione o tutor.");
      const payload = {
        tutor_id: form.tutor_id,
        name: form.name.trim(),
        breed: form.breed || null,
        size: form.size || null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        sex: form.sex || null,
        neutered: form.neutered,
        birth_date: form.birth_date || null,
        microchip: form.microchip || null,
        vet_name: form.vet_name || null,
        vet_phone: form.vet_phone || null,
        plan: form.plan || null,
        notes: form.notes || null,
        photo_url: form.photo_url || null,
      };
      if (dog) {
        const { error } = await supabase.from("dogs").update(payload).eq("id", dog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dogs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(dog ? "Cão atualizado." : "Cão cadastrado.");
      qc.invalidateQueries({ queryKey: ["dogs"] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto até 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${dog?.id ?? "new"}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("dogs").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("dogs").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? "";
      setForm((f) => ({ ...f, photo_url: url }));
      toast.success("Foto enviada.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">
          {form.photo_url ? (
            <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <DogIcon className="h-7 w-7" />
            </div>
          )}
        </div>
        <Label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar foto
          </span>
        </Label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tutor *">
          <Select value={form.tutor_id} onValueChange={(v) => setForm({ ...form, tutor_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(tutorsQuery.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Nome *">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Raça">
          <Input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
        </Field>
        <Field label="Porte">
          <Select
            value={form.size}
            onValueChange={(v) => setForm({ ...form, size: v as DogSize })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SIZE_LABEL) as DogSize[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SIZE_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Peso (kg)">
          <Input
            type="number"
            step="0.1"
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
          />
        </Field>
        <Field label="Sexo">
          <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v as DogSex })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="macho">Macho</SelectItem>
              <SelectItem value="femea">Fêmea</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Data de nascimento">
          <Input
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
          />
        </Field>
        <Field label="Microchip">
          <Input
            value={form.microchip}
            onChange={(e) => setForm({ ...form, microchip: e.target.value })}
          />
        </Field>
        <Field label="Veterinário">
          <Input
            value={form.vet_name}
            onChange={(e) => setForm({ ...form, vet_name: e.target.value })}
          />
        </Field>
        <Field label="Telefone do vet.">
          <Input
            value={form.vet_phone}
            onChange={(e) => setForm({ ...form, vet_phone: e.target.value })}
          />
        </Field>
        <Field label="Plano contratado">
          <Input value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
        </Field>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.neutered}
              onCheckedChange={(v) => setForm({ ...form, neutered: !!v })}
            />
            Castrado
          </label>
        </div>
      </div>
      <Field label="Observações">
        <Textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>

      <SheetFooter className="mt-2">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar
        </Button>
      </SheetFooter>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ============== Saúde ============== */

type HealthSection = {
  table: "dog_vaccines" | "dog_dewormings" | "dog_flea_treatments" | "dog_allergies" | "dog_diet_restrictions" | "dog_medications" | "dog_medical_history";
  label: string;
  fields: { key: string; label: string; type?: "date" | "text" | "textarea"; required?: boolean }[];
};

const HEALTH_SECTIONS: HealthSection[] = [
  {
    table: "dog_vaccines",
    label: "Vacinas",
    fields: [
      { key: "vaccine_type", label: "Vacina (V8, V10, Antirrábica...)", required: true },
      { key: "applied_date", label: "Aplicada em", type: "date", required: true },
      { key: "next_due_date", label: "Próxima dose", type: "date" },
      { key: "batch", label: "Lote" },
      { key: "vet_name", label: "Veterinário" },
    ],
  },
  {
    table: "dog_dewormings",
    label: "Vermífugo",
    fields: [
      { key: "product", label: "Produto" },
      { key: "applied_date", label: "Aplicado em", type: "date", required: true },
      { key: "next_due_date", label: "Próxima dose", type: "date" },
    ],
  },
  {
    table: "dog_flea_treatments",
    label: "Antipulgas",
    fields: [
      { key: "product", label: "Produto" },
      { key: "applied_date", label: "Aplicado em", type: "date", required: true },
      { key: "next_due_date", label: "Próxima dose", type: "date" },
    ],
  },
  {
    table: "dog_allergies",
    label: "Alergias",
    fields: [
      { key: "description", label: "Descrição", required: true },
      { key: "severity", label: "Gravidade (leve/moderada/grave)" },
    ],
  },
  {
    table: "dog_diet_restrictions",
    label: "Restrições alimentares",
    fields: [{ key: "description", label: "Descrição", required: true }],
  },
  {
    table: "dog_medications",
    label: "Medicamentos contínuos",
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "dose", label: "Dose" },
      { key: "frequency", label: "Frequência" },
    ],
  },
  {
    table: "dog_medical_history",
    label: "Histórico médico",
    fields: [
      { key: "event_date", label: "Data", type: "date", required: true },
      { key: "description", label: "Ocorrência", type: "textarea", required: true },
      { key: "vet_name", label: "Veterinário" },
    ],
  },
];

function HealthTab({ dogId }: { dogId: string }) {
  return (
    <div className="space-y-6">
      {HEALTH_SECTIONS.map((s) => (
        <HealthSectionBlock key={s.table} section={s} dogId={dogId} />
      ))}
    </div>
  );
}

function HealthSectionBlock({ section, dogId }: { section: HealthSection; dogId: string }) {
  const qc = useQueryClient();
  const key = ["health", section.table, dogId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(section.table)
        .select("*")
        .eq("dog_id", dogId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Record<string, unknown>[];
    },
  });

  const [draft, setDraft] = useState<Record<string, string>>({});

  const addMut = useMutation({
    mutationFn: async () => {
      for (const f of section.fields) {
        if (f.required && !draft[f.key]) throw new Error(`${f.label} é obrigatório.`);
      }
      const payload: Record<string, unknown> = { dog_id: dogId };
      for (const f of section.fields) {
        payload[f.key] = draft[f.key] || null;
      }
      const { error } = await supabase.from(section.table).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adicionado.");
      setDraft({});
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(section.table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <div className="rounded-lg border p-4">
      <h4 className="mb-3 font-semibold">{section.label}</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {section.fields.map((f) => (
          <div key={f.key}>
            <Label className="text-xs">{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea
                rows={2}
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              />
            ) : (
              <Input
                type={f.type === "date" ? "date" : "text"}
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>

      {q.data && q.data.length > 0 ? (
        <>
          <Separator className="my-4" />
          <ul className="space-y-2">
            {q.data.map((row) => (
              <li
                key={String(row.id)}
                className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-2 text-sm"
              >
                <div className="flex-1">
                  {section.fields.map((f) => {
                    const v = row[f.key];
                    if (!v) return null;
                    return (
                      <span key={f.key} className="mr-3">
                        <span className="text-muted-foreground">{f.label}:</span> {String(v)}
                      </span>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => delMut.mutate(String(row.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/* ============== Comportamento ============== */

function BehaviorTab({ dogId }: { dogId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["behavior", dogId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dog_behavior")
        .select("*")
        .eq("dog_id", dogId)
        .maybeSingle();
      if (error) throw error;
      return (data as Behavior | null) ?? {
        dog_id: dogId,
        traits: [],
        compat_small: false,
        compat_medium: false,
        compat_large: false,
        compat_males: false,
        compat_females: false,
        notes: "",
        updated_at: "",
      };
    },
  });

  const [form, setForm] = useState<Behavior | null>(null);
  const current = form ?? q.data ?? null;

  function update<K extends keyof Behavior>(k: K, v: Behavior[K]) {
    if (!current) return;
    setForm({ ...(current as Behavior), [k]: v });
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!current) return;
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      const payload = {
        dog_id: dogId,
        traits: current.traits,
        compat_small: current.compat_small,
        compat_medium: current.compat_medium,
        compat_large: current.compat_large,
        compat_males: current.compat_males,
        compat_females: current.compat_females,
        notes: current.notes,
        updated_by: uid,
      };
      const { error } = await supabase
        .from("dog_behavior")
        .upsert(payload, { onConflict: "dog_id" });
      if (error) throw error;
      // snapshot histórico
      const { error: hErr } = await supabase.from("dog_behavior_history").insert({
        dog_id: dogId,
        traits: current.traits,
        compat_small: current.compat_small,
        compat_medium: current.compat_medium,
        compat_large: current.compat_large,
        compat_males: current.compat_males,
        compat_females: current.compat_females,
        notes: current.notes,
        created_by: uid,
      });
      if (hErr) throw hErr;
    },
    onSuccess: () => {
      toast.success("Comportamento atualizado.");
      qc.invalidateQueries({ queryKey: ["behavior", dogId] });
      qc.invalidateQueries({ queryKey: ["behavior-history", dogId] });
      setForm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!current) return <div className="py-4 text-sm text-muted-foreground">Carregando...</div>;

  function toggleTrait(t: Trait) {
    if (!current) return;
    const has = current.traits.includes(t);
    update("traits", has ? current.traits.filter((x) => x !== t) : [...current.traits, t]);
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Traços</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {TRAITS.map((t) => {
            const active = current.traits.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTrait(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent",
                )}
              >
                {TRAIT_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground">Compatibilidade</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <CompatCheck label="Com cães pequenos" checked={current.compat_small} onChange={(v) => update("compat_small", v)} />
          <CompatCheck label="Com cães médios" checked={current.compat_medium} onChange={(v) => update("compat_medium", v)} />
          <CompatCheck label="Com cães grandes" checked={current.compat_large} onChange={(v) => update("compat_large", v)} />
          <CompatCheck label="Com machos" checked={current.compat_males} onChange={(v) => update("compat_males", v)} />
          <CompatCheck label="Com fêmeas" checked={current.compat_females} onChange={(v) => update("compat_females", v)} />
        </div>
      </div>

      <Field label="Observações livres">
        <Textarea
          rows={4}
          value={current.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Como ele se comporta com outros cães, com pessoas, em ambientes novos..."
        />
      </Field>

      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar (gera registro no histórico)
        </Button>
      </div>
    </div>
  );
}

function CompatCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      {label}
    </label>
  );
}

/* ============== Histórico ============== */

function BehaviorHistory({ dogId }: { dogId: string }) {
  const q = useQuery({
    queryKey: ["behavior-history", dogId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dog_behavior_history")
        .select("*")
        .eq("dog_id", dogId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        event_date: string;
        traits: Trait[];
        compat_small: boolean | null;
        compat_medium: boolean | null;
        compat_large: boolean | null;
        compat_males: boolean | null;
        compat_females: boolean | null;
        notes: string | null;
        created_at: string;
      }>;
    },
  });

  if (q.isLoading) return <div className="py-4 text-sm text-muted-foreground">Carregando...</div>;
  if (!q.data || q.data.length === 0)
    return (
      <div className="rounded-lg border border-dashed py-10 text-center">
        <History className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum registro ainda. Salve na aba Comportamento para gerar o primeiro.
        </p>
      </div>
    );

  return (
    <ul className="space-y-3">
      {q.data.map((h) => (
        <li key={h.id} className="rounded-lg border p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">
              {new Date(h.created_at).toLocaleString("pt-BR")}
            </span>
            <span className="text-xs text-muted-foreground">{h.event_date}</span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {h.traits.length === 0 ? (
              <span className="text-xs text-muted-foreground">Sem traços</span>
            ) : (
              h.traits.map((t) => (
                <Badge key={t} variant="secondary">
                  {TRAIT_LABEL[t]}
                </Badge>
              ))
            )}
          </div>
          <div className="mb-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
            {h.compat_small ? <span>· pequenos</span> : null}
            {h.compat_medium ? <span>· médios</span> : null}
            {h.compat_large ? <span>· grandes</span> : null}
            {h.compat_males ? <span>· machos</span> : null}
            {h.compat_females ? <span>· fêmeas</span> : null}
          </div>
          {h.notes ? <p className="text-muted-foreground">{h.notes}</p> : null}
        </li>
      ))}
    </ul>
  );
}
