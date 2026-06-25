import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, Syringe, Pill, Bug, ShieldAlert, Utensils, Stethoscope } from "lucide-react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/saude")({
  head: () => ({ meta: [{ title: "Saúde — Quintal da Gabi" }] }),
  component: SaudePage,
});

type DogOpt = { id: string; name: string };

function useDogs() {
  return useQuery({
    queryKey: ["dogs-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dogs").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as DogOpt[];
    },
  });
}

function SaudePage() {
  const dogsQ = useDogs();
  const [dogId, setDogId] = useState<string>("");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Saúde</h1>
          <p className="text-muted-foreground">Vacinas, vermífugo, antipulgas, medicamentos, alergias e histórico médico.</p>
        </div>
        <div className="w-72">
          <Label className="text-xs">Selecionar cão</Label>
          <Select value={dogId} onValueChange={setDogId}>
            <SelectTrigger><SelectValue placeholder="Escolha um cão" /></SelectTrigger>
            <SelectContent>
              {(dogsQ.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <HealthAlertsPanel />

      {!dogId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione um cão acima para gerenciar registros individuais.</CardContent></Card>
      ) : (
        <Tabs defaultValue="vacinas" className="w-full">
          <TabsList className="flex-wrap">
            <TabsTrigger value="vacinas"><Syringe className="mr-1 h-4 w-4" />Vacinas</TabsTrigger>
            <TabsTrigger value="vermifugo"><Bug className="mr-1 h-4 w-4" />Vermífugo</TabsTrigger>
            <TabsTrigger value="pulga"><ShieldAlert className="mr-1 h-4 w-4" />Antipulgas</TabsTrigger>
            <TabsTrigger value="meds"><Pill className="mr-1 h-4 w-4" />Medicamentos</TabsTrigger>
            <TabsTrigger value="alergias">Alergias</TabsTrigger>
            <TabsTrigger value="dieta"><Utensils className="mr-1 h-4 w-4" />Restrições</TabsTrigger>
            <TabsTrigger value="historico"><Stethoscope className="mr-1 h-4 w-4" />Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="vacinas"><DateProductSection dogId={dogId} table="dog_vaccines" titleSingular="Vacina" fields={[{k:"vaccine_type",l:"Tipo",required:true},{k:"batch",l:"Lote"},{k:"vet_name",l:"Veterinário"}]} /></TabsContent>
          <TabsContent value="vermifugo"><DateProductSection dogId={dogId} table="dog_dewormings" titleSingular="Vermífugo" fields={[{k:"product",l:"Produto",required:true}]} /></TabsContent>
          <TabsContent value="pulga"><DateProductSection dogId={dogId} table="dog_flea_treatments" titleSingular="Antipulgas" fields={[{k:"product",l:"Produto",required:true}]} /></TabsContent>
          <TabsContent value="meds"><MedsSection dogId={dogId} /></TabsContent>
          <TabsContent value="alergias"><SimpleListSection dogId={dogId} table="dog_allergies" titleSingular="Alergia" fields={[{k:"description",l:"Descrição",required:true},{k:"severity",l:"Severidade"}]} /></TabsContent>
          <TabsContent value="dieta"><SimpleListSection dogId={dogId} table="dog_diet_restrictions" titleSingular="Restrição" fields={[{k:"description",l:"Descrição",required:true}]} /></TabsContent>
          <TabsContent value="historico"><HistorySection dogId={dogId} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

type Field = { k: string; l: string; required?: boolean };

function DateProductSection({ dogId, table, titleSingular, fields }: { dogId: string; table: "dog_vaccines"|"dog_dewormings"|"dog_flea_treatments"; titleSingular: string; fields: Field[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ applied_date: format(new Date(), "yyyy-MM-dd"), next_due_date: "", notes: "" });

  const q = useQuery({
    queryKey: [table, dogId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(table).select("*").eq("dog_id", dogId).order("applied_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = { dog_id: dogId, applied_date: form.applied_date, next_due_date: form.next_due_date || null, notes: form.notes || null };
      for (const f of fields) payload[f.k] = form[f.k] || null;
      const { error } = await (supabase as any).from(table).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${titleSingular} registrado`); setOpen(false); setForm({ applied_date: format(new Date(), "yyyy-MM-dd"), next_due_date: "", notes: "" }); qc.invalidateQueries({ queryKey: [table, dogId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from(table).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: [table, dogId] }); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{titleSingular}s</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo {titleSingular.toLowerCase()}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              {fields.map((f) => (
                <div key={f.k}><Label>{f.l}{f.required && " *"}</Label><Input value={form[f.k] ?? ""} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Aplicado em</Label><Input type="date" value={form.applied_date} onChange={(e) => setForm({ ...form, applied_date: e.target.value })} /></div>
                <div><Label>Próxima dose</Label><Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <p className="text-muted-foreground">Carregando…</p> : (q.data ?? []).length === 0 ? <p className="text-muted-foreground">Nenhum registro.</p> : (
          <ul className="divide-y">
            {(q.data ?? []).map((r: any) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{fields.map(f => r[f.k]).filter(Boolean).join(" • ") || "—"}</p>
                  <p className="text-xs text-muted-foreground">Aplicado: {r.applied_date} {r.next_due_date && `• Próxima: ${r.next_due_date}`}</p>
                  {r.notes && <p className="text-xs">{r.notes}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => del.mutate(r.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MedsSection({ dogId }: { dogId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", dose: "", frequency: "", notes: "" });
  const q = useQuery({
    queryKey: ["dog_medications", dogId],
    queryFn: async () => { const { data, error } = await supabase.from("dog_medications").select("*").eq("dog_id", dogId).order("created_at", { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("dog_medications").insert({ dog_id: dogId, ...form, active: true }); if (error) throw error; },
    onSuccess: () => { toast.success("Medicamento adicionado"); setOpen(false); setForm({ name: "", dose: "", frequency: "", notes: "" }); qc.invalidateQueries({ queryKey: ["dog_medications", dogId] }); },
  });
  const toggle = useMutation({
    mutationFn: async (r: any) => { const { error } = await supabase.from("dog_medications").update({ active: !r.active }).eq("id", r.id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dog_medications", dogId] }),
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Medicamentos</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo medicamento</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Dose</Label><Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} /></div>
              <div><Label>Frequência</Label><Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} /></div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending || !form.name}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {(q.data ?? []).length === 0 ? <p className="text-muted-foreground">Nenhum medicamento.</p> : (
          <ul className="divide-y">
            {(q.data ?? []).map((r: any) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{r.name} <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Ativo" : "Encerrado"}</Badge></p>
                  <p className="text-xs text-muted-foreground">{[r.dose, r.frequency].filter(Boolean).join(" • ")}</p>
                  {r.notes && <p className="text-xs">{r.notes}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={() => toggle.mutate(r)}>{r.active ? "Encerrar" : "Reativar"}</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleListSection({ dogId, table, titleSingular, fields }: { dogId: string; table: "dog_allergies"|"dog_diet_restrictions"; titleSingular: string; fields: Field[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: [table, dogId],
    queryFn: async () => { const { data, error } = await (supabase as any).from(table).select("*").eq("dog_id", dogId).order("created_at", { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const create = useMutation({
    mutationFn: async () => { const payload: any = { dog_id: dogId }; for (const f of fields) payload[f.k] = form[f.k] || null; const { error } = await (supabase as any).from(table).insert(payload); if (error) throw error; },
    onSuccess: () => { toast.success("Adicionado"); setOpen(false); setForm({}); qc.invalidateQueries({ queryKey: [table, dogId] }); },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from(table).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, dogId] }),
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{titleSingular}s</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova {titleSingular.toLowerCase()}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              {fields.map((f) => (
                <div key={f.k}><Label>{f.l}</Label><Input value={form[f.k] ?? ""} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} /></div>
              ))}
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {(q.data ?? []).length === 0 ? <p className="text-muted-foreground">Nenhum registro.</p> : (
          <ul className="divide-y">
            {(q.data ?? []).map((r: any) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <div><p className="font-medium">{r.description}</p>{r.severity && <p className="text-xs text-muted-foreground">{r.severity}</p>}</div>
                <Button variant="ghost" size="sm" onClick={() => del.mutate(r.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HistorySection({ dogId }: { dogId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ event_date: format(new Date(), "yyyy-MM-dd"), description: "", vet_name: "" });
  const q = useQuery({
    queryKey: ["dog_medical_history", dogId],
    queryFn: async () => { const { data, error } = await supabase.from("dog_medical_history").select("*").eq("dog_id", dogId).order("event_date", { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("dog_medical_history").insert({ dog_id: dogId, ...form }); if (error) throw error; },
    onSuccess: () => { toast.success("Registrado"); setOpen(false); setForm({ event_date: format(new Date(), "yyyy-MM-dd"), description: "", vet_name: "" }); qc.invalidateQueries({ queryKey: ["dog_medical_history", dogId] }); },
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Histórico médico</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Registrar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo evento médico</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Data</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
              <div><Label>Veterinário</Label><Input value={form.vet_name} onChange={(e) => setForm({ ...form, vet_name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending || !form.description}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {(q.data ?? []).length === 0 ? <p className="text-muted-foreground">Nenhum evento.</p> : (
          <ul className="divide-y">
            {(q.data ?? []).map((r: any) => (
              <li key={r.id} className="py-2">
                <p className="text-xs text-muted-foreground">{r.event_date} {r.vet_name && `• ${r.vet_name}`}</p>
                <p>{r.description}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

type HealthAlertRow = {
  record_id: string;
  dog_id: string;
  dog_name: string;
  tutor_name: string | null;
  kind: "vacina" | "vermifugo" | "antipulgas";
  item: string;
  next_due_date: string;
  days_remaining: number;
  status: "vencido" | "proximo" | "em_dia";
};

function HealthAlertsPanel() {
  const q = useQuery({
    queryKey: ["health-alerts-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_health_alerts").select("*").neq("status", "em_dia")
        .order("next_due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HealthAlertRow[];
    },
  });

  const rows = q.data ?? [];
  const overdue = rows.filter((r) => r.status === "vencido");
  const soon = rows.filter((r) => r.status === "proximo");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          Alertas de saúde
        </CardTitle>
        <div className="flex gap-2 text-xs">
          <Badge variant="destructive">{overdue.length} vencidos</Badge>
          <Badge variant="secondary">{soon.length} próximos</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum alerta — todos os cães estão em dia.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cão</TableHead>
                <TableHead>Tutor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.kind}-${r.record_id}`}>
                  <TableCell className="font-medium">{r.dog_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.tutor_name ?? "—"}</TableCell>
                  <TableCell>{r.kind === "vacina" ? "Vacina" : r.kind === "vermifugo" ? "Vermífugo" : "Antipulgas"}</TableCell>
                  <TableCell>{r.item}</TableCell>
                  <TableCell>{new Date(r.next_due_date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    {r.status === "vencido" ? (
                      <Badge variant="destructive">{Math.abs(r.days_remaining)}d atrasado</Badge>
                    ) : (
                      <Badge variant="secondary">em {r.days_remaining}d</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
