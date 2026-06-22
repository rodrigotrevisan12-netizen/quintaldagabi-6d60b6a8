import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/ocorrencias")({
  head: () => ({ meta: [{ title: "Ocorrências — Quintal da Gabi" }] }),
  component: OcorrenciasPage,
});

const CATEGORIES = [
  { v: "briga", l: "Briga" }, { v: "mal_estar", l: "Mal-estar" }, { v: "fuga", l: "Fuga" },
  { v: "machucado", l: "Machucado" }, { v: "comportamento", l: "Comportamento" },
  { v: "observacao", l: "Observação" }, { v: "outro", l: "Outro" },
];
const SEVERITIES = [
  { v: "baixa", l: "Baixa" }, { v: "media", l: "Média" }, { v: "alta", l: "Alta" }, { v: "urgente", l: "Urgente" },
];
const sevColor: Record<string, string> = { baixa: "secondary", media: "default", alta: "destructive", urgente: "destructive" };

function OcorrenciasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"abertas" | "resolvidas" | "todas">("abertas");
  const [form, setForm] = useState({ dog_id: "", category: "observacao", severity: "baixa", description: "", occurred_at: format(new Date(), "yyyy-MM-dd'T'HH:mm") });

  const dogsQ = useQuery({
    queryKey: ["dogs-min"],
    queryFn: async () => { const { data, error } = await supabase.from("dogs").select("id,name").order("name"); if (error) throw error; return data ?? []; },
  });

  const q = useQuery({
    queryKey: ["occurrences", filter],
    queryFn: async () => {
      let qb = (supabase as any).from("occurrences").select("*, dog:dogs(name)").order("occurred_at", { ascending: false }).limit(200);
      if (filter === "abertas") qb = qb.eq("resolved", false);
      else if (filter === "resolvidas") qb = qb.eq("resolved", true);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("occurrences").insert({
        dog_id: form.dog_id || null,
        category: form.category,
        severity: form.severity,
        description: form.description,
        occurred_at: new Date(form.occurred_at).toISOString(),
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ocorrência registrada");
      setOpen(false);
      setForm({ dog_id: "", category: "observacao", severity: "baixa", description: "", occurred_at: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
      qc.invalidateQueries({ queryKey: ["occurrences"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await (supabase as any).from("occurrences").update({ resolved: true, resolution_notes: notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Resolvida"); qc.invalidateQueries({ queryKey: ["occurrences"] }); },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Ocorrências</h1>
          <p className="text-muted-foreground">Registro de eventos do dia (briga, mal-estar, fuga, machucado, observações).</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="abertas">Abertas</SelectItem>
              <SelectItem value="resolvidas">Resolvidas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Nova ocorrência</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova ocorrência</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Cão (opcional)</Label>
                  <Select value={form.dog_id} onValueChange={(v) => setForm({ ...form, dog_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sem cão específico" /></SelectTrigger>
                    <SelectContent>{(dogsQ.data ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Gravidade</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Quando</Label><Input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} /></div>
                <div><Label>Descrição *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending || !form.description}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Registrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {q.isLoading ? <p>Carregando…</p> : (q.data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma ocorrência.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {(q.data ?? []).map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {CATEGORIES.find((c) => c.v === r.category)?.l ?? r.category}
                    {r.dog?.name && <span className="text-muted-foreground">• {r.dog.name}</span>}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={sevColor[r.severity] as any}>{SEVERITIES.find((s) => s.v === r.severity)?.l}</Badge>
                    {r.resolved ? <Badge variant="outline"><CheckCircle2 className="mr-1 h-3 w-3" />Resolvida</Badge> : <Badge variant="destructive">Aberta</Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{format(new Date(r.occurred_at), "dd/MM/yyyy HH:mm")}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>{r.description}</p>
                {r.resolution_notes && <p className="text-sm text-muted-foreground"><strong>Resolução:</strong> {r.resolution_notes}</p>}
                {!r.resolved && (
                  <ResolveForm onResolve={(notes) => resolve.mutate({ id: r.id, notes })} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ResolveForm({ onResolve }: { onResolve: (notes: string) => void }) {
  const [notes, setNotes] = useState("");
  return (
    <div className="flex gap-2 pt-2">
      <Input placeholder="Notas de resolução…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button size="sm" onClick={() => onResolve(notes)}>Marcar resolvida</Button>
    </div>
  );
}
