import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Mail, Phone, MapPin, UserPlus, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { inviteTutor } from "@/lib/tutors.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/app/tutores")({
  head: () => ({ meta: [{ title: "Tutores — Quintal da Gabi" }] }),
  component: TutoresPage,
});

type Tutor = {
  id: string;
  full_name: string;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string;
};

type EmergencyContact = {
  id?: string;
  name: string;
  phone: string;
  relationship: string;
};

type AuthorizedPickup = {
  id?: string;
  name: string;
  document: string;
  phone: string;
  relationship: string;
};

const tutorSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome").max(120),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  rg: z.string().trim().max(20).optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.union([z.string().trim().email("E-mail inválido").max(255), z.literal("")]),
  address_street: z.string().trim().max(120).optional().or(z.literal("")),
  address_number: z.string().trim().max(20).optional().or(z.literal("")),
  address_complement: z.string().trim().max(60).optional().or(z.literal("")),
  address_neighborhood: z.string().trim().max(80).optional().or(z.literal("")),
  address_city: z.string().trim().max(80).optional().or(z.literal("")),
  address_state: z.string().trim().max(2).optional().or(z.literal("")),
  address_zip: z.string().trim().max(10).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function blankTutor(): z.infer<typeof tutorSchema> {
  return {
    full_name: "",
    cpf: "",
    rg: "",
    birth_date: "",
    phone: "",
    whatsapp: "",
    email: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    notes: "",
  };
}

function TutoresPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Tutor | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Tutor | null>(null);

  const tutorsQuery = useQuery({
    queryKey: ["tutors"],
    queryFn: async (): Promise<Tutor[]> => {
      const { data, error } = await supabase
        .from("tutors")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tutor[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tutorsQuery.data ?? [];
    return (tutorsQuery.data ?? []).filter((t) =>
      [t.full_name, t.cpf, t.phone, t.whatsapp, t.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [tutorsQuery.data, search]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tutors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tutor removido.");
      qc.invalidateQueries({ queryKey: ["tutors"] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível remover."),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Tutores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro completo dos clientes, contatos de emergência e pessoas autorizadas.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo tutor
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF, telefone ou e-mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {tutorsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-display text-lg">Nenhum tutor por aqui ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Clique em <strong>Novo tutor</strong> para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-lg font-semibold">{t.full_name}</p>
                    {t.user_id ? (
                      <Badge variant="secondary" className="text-[10px]">acesso liberado</Badge>
                    ) : null}
                  </div>
                  {t.cpf ? (
                    <p className="text-xs text-muted-foreground">CPF {t.cpf}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setToDelete(t)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                {t.phone ? (
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" /> {t.phone}
                  </span>
                ) : null}
                {t.email ? (
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" /> {t.email}
                  </span>
                ) : null}
                {t.address_city ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> {t.address_city}
                    {t.address_state ? `/${t.address_state}` : ""}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <TutorSheet
        open={creating || editing !== null}
        tutor={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {toDelete?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai apagar também os contatos de emergência e pessoas autorizadas
              vinculadas. Cães cadastrados para esse tutor serão impactados — confira antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMut.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TutorSheet({
  open,
  tutor,
  onClose,
}: {
  open: boolean;
  tutor: Tutor | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const inviteFn = useServerFn(inviteTutor);

  const isEdit = tutor !== null;

  const [form, setForm] = useState(blankTutor());
  const [emergency, setEmergency] = useState<EmergencyContact[]>([]);
  const [pickups, setPickups] = useState<AuthorizedPickup[]>([]);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Reset form ao abrir
  useMemo(() => {
    if (!open) return;
    if (tutor) {
      setForm({
        full_name: tutor.full_name ?? "",
        cpf: tutor.cpf ?? "",
        rg: tutor.rg ?? "",
        birth_date: tutor.birth_date ?? "",
        phone: tutor.phone ?? "",
        whatsapp: tutor.whatsapp ?? "",
        email: tutor.email ?? "",
        address_street: tutor.address_street ?? "",
        address_number: tutor.address_number ?? "",
        address_complement: tutor.address_complement ?? "",
        address_neighborhood: tutor.address_neighborhood ?? "",
        address_city: tutor.address_city ?? "",
        address_state: tutor.address_state ?? "",
        address_zip: tutor.address_zip ?? "",
        notes: tutor.notes ?? "",
      });
      // carrega contatos
      loadRelations(tutor.id);
    } else {
      setForm(blankTutor());
      setEmergency([]);
      setPickups([]);
    }
  }, [open, tutor?.id]);

  async function loadRelations(tutorId: string) {
    const [{ data: ec }, { data: ap }] = await Promise.all([
      supabase
        .from("tutor_emergency_contacts")
        .select("id,name,phone,relationship")
        .eq("tutor_id", tutorId),
      supabase
        .from("tutor_authorized_pickups")
        .select("id,name,document,phone,relationship")
        .eq("tutor_id", tutorId),
    ]);
    setEmergency(
      (ec ?? []).map((c) => ({
        id: c.id,
        name: c.name ?? "",
        phone: c.phone ?? "",
        relationship: c.relationship ?? "",
      })),
    );
    setPickups(
      (ap ?? []).map((p) => ({
        id: p.id,
        name: p.name ?? "",
        document: p.document ?? "",
        phone: p.phone ?? "",
        relationship: p.relationship ?? "",
      })),
    );
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const parsed = tutorSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed.data)) {
        payload[k] = v === "" ? null : v;
      }

      let tutorId = tutor?.id ?? null;
      if (isEdit && tutorId) {
        const { error } = await supabase.from("tutors").update(payload).eq("id", tutorId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("tutors")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        tutorId = data.id;
      }

      // Sincroniza contatos: apaga tudo e reinsere (simples e correto)
      if (tutorId) {
        await supabase.from("tutor_emergency_contacts").delete().eq("tutor_id", tutorId);
        if (emergency.length) {
          const rows = emergency
            .filter((e) => e.name.trim())
            .map((e) => ({
              tutor_id: tutorId!,
              name: e.name.trim(),
              phone: e.phone.trim() || null,
              relationship: e.relationship.trim() || null,
            }));
          if (rows.length) {
            const { error } = await supabase.from("tutor_emergency_contacts").insert(rows);
            if (error) throw error;
          }
        }

        await supabase.from("tutor_authorized_pickups").delete().eq("tutor_id", tutorId);
        if (pickups.length) {
          const rows = pickups
            .filter((p) => p.name.trim())
            .map((p) => ({
              tutor_id: tutorId!,
              name: p.name.trim(),
              document: p.document.trim() || null,
              phone: p.phone.trim() || null,
              relationship: p.relationship.trim() || null,
            }));
          if (rows.length) {
            const { error } = await supabase.from("tutor_authorized_pickups").insert(rows);
            if (error) throw error;
          }
        }
      }

      toast.success(isEdit ? "Tutor atualizado." : "Tutor cadastrado.");
      qc.invalidateQueries({ queryKey: ["tutors"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite() {
    if (!tutor?.id) {
      toast.error("Salve o tutor antes de enviar o convite.");
      return;
    }
    if (!form.email) {
      toast.error("Informe um e-mail para enviar o convite.");
      return;
    }
    setInviting(true);
    try {
      const result = await inviteFn({ data: { tutorId: tutor.id, email: form.email } });
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["tutors"] });
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível enviar o convite.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar tutor" : "Novo tutor"}</SheetTitle>
          <SheetDescription>
            Preencha os dados do cliente. Você pode enviar o acesso ao portal depois de salvar.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <section className="space-y-4">
            <h3 className="font-display text-base font-semibold">Dados pessoais</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome completo *">
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
              </Field>
              <Field label="Data de nascimento">
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => update("birth_date", e.target.value)}
                />
              </Field>
              <Field label="CPF">
                <Input value={form.cpf} onChange={(e) => update("cpf", e.target.value)} />
              </Field>
              <Field label="RG">
                <Input value={form.rg} onChange={(e) => update("rg", e.target.value)} />
              </Field>
              <Field label="Telefone">
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
              </Field>
              <Field label="E-mail" full>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="font-display text-base font-semibold">Endereço</h3>
            <div className="grid gap-3 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <Field label="Rua">
                  <Input
                    value={form.address_street}
                    onChange={(e) => update("address_street", e.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Número">
                  <Input
                    value={form.address_number}
                    onChange={(e) => update("address_number", e.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Complemento">
                  <Input
                    value={form.address_complement}
                    onChange={(e) => update("address_complement", e.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Bairro">
                  <Input
                    value={form.address_neighborhood}
                    onChange={(e) => update("address_neighborhood", e.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Cidade">
                  <Input
                    value={form.address_city}
                    onChange={(e) => update("address_city", e.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-1">
                <Field label="UF">
                  <Input
                    maxLength={2}
                    value={form.address_state}
                    onChange={(e) => update("address_state", e.target.value.toUpperCase())}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="CEP">
                  <Input
                    value={form.address_zip}
                    onChange={(e) => update("address_zip", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </section>

          <Separator />

          <RepeatableList
            title="Contatos de emergência"
            items={emergency}
            onChange={setEmergency}
            blank={() => ({ name: "", phone: "", relationship: "" })}
            fields={[
              { key: "name", label: "Nome", w: "flex-1" },
              { key: "phone", label: "Telefone", w: "w-40" },
              { key: "relationship", label: "Parentesco", w: "w-40" },
            ]}
          />

          <Separator />

          <RepeatableList
            title="Pessoas autorizadas a retirar"
            items={pickups}
            onChange={setPickups}
            blank={() => ({ name: "", document: "", phone: "", relationship: "" })}
            fields={[
              { key: "name", label: "Nome", w: "flex-1" },
              { key: "document", label: "Documento", w: "w-36" },
              { key: "phone", label: "Telefone", w: "w-36" },
              { key: "relationship", label: "Parentesco", w: "w-32" },
            ]}
          />

          <Separator />

          <section className="space-y-2">
            <h3 className="font-display text-base font-semibold">Observações</h3>
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Preferências, horários, comportamento, qualquer coisa que ajude a equipe."
            />
          </section>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {isEdit ? (
            <Button
              type="button"
              variant="outline"
              disabled={inviting || !form.email}
              onClick={handleInvite}
            >
              {inviting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
              {tutor?.user_id ? "Reenviar acesso por e-mail" : "Enviar acesso por e-mail"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={"space-y-1.5 " + (full ? "sm:col-span-2" : "")}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

type RepeatableField<T> = { key: keyof T; label: string; w: string };
function RepeatableList<T extends Record<string, string | undefined>>({
  title,
  items,
  onChange,
  blank,
  fields,
}: {
  title: string;
  items: T[];
  onChange: (next: T[]) => void;
  blank: () => T;
  fields: RepeatableField<T>[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, blank()])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum cadastro ainda.</p>
      ) : (
        <div className="space-y-2">
          {items.map((row, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
              {fields.map((f) => (
                <div key={String(f.key)} className={f.w + " min-w-[120px]"}>
                  <Label className="text-[11px]">{f.label}</Label>
                  <Input
                    value={(row[f.key] as string) ?? ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], [f.key]: e.target.value };
                      onChange(next);
                    }}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
