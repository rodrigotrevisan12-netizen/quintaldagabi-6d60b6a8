import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ListChecks, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/app/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Quintal da Gabi" }] }),
  component: TarefasPage,
});

const PRIORITIES = [{ v: "baixa", l: "Baixa" }, { v: "normal", l: "Normal" }, { v: "alta", l: "Alta" }, { v: "urgente", l: "Urgente" }];
const STATUSES = [{ v: "pendente", l: "Pendente" }, { v: "em_andamento", l: "Em andamento" }, { v: "concluida", l: "Concluída" }, { v: "cancelada", l: "Cancelada" }];
const prioColor: Record<string, any> = { baixa: "secondary", normal: "default", alta: "destructive", urgente: "destructive" };

function TarefasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"abertas" | "todas" | "concluidas">("abertas");
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", due_date: "", priority: "normal" });

  const employeesQ = useQuery({
    queryKey: ["employees-min"],
    queryFn: async () => { const { data, error } = await supabase.from("employees").select("user_id,full_name").eq("active", true).not("user_id", "is", null); if (error) throw error; return data ?? []; },
  });

  const q = useQuery({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      let qb = (supabase as any).from("tasks").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter === "abertas") qb = qb.in("status", ["pendente", "em_andamento"]);
      else if (filter === "concluidas") qb = qb.eq("status", "concluida");
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("tasks").insert({
        title: form.title,
        description: form.description || null,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
        priority: form.priority,
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tarefa criada"); setOpen(false); setForm({ title: "", description: "", assigned_to: "", due_date: "", priority: "normal" }); qc.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "concluida") patch.completed_at = new Date().toISOString();
      const { error } = await (supabase as any).from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("tasks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  const employees: any[] = employeesQ.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Tarefas</h1>
          <p className="text-muted-foreground">Lista de tarefas operacionais com responsável, prazo e status.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="abertas">Abertas</SelectItem>
              <SelectItem value="concluidas">Concluídas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Nova tarefa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Responsável</Label>
                    <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                      <SelectTrigger><SelectValue placeholder="Não atribuído" /></SelectTrigger>
                      <SelectContent>{employees.map((e) => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending || !form.title}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {q.isLoading ? <p>Carregando…</p> : (q.data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><ListChecks className="mx-auto mb-2 h-8 w-8" />Nenhuma tarefa.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {(q.data ?? []).map((t: any) => {
            const owner = employees.find((e) => e.user_id === t.assigned_to);
            return (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={prioColor[t.priority]}>{PRIORITIES.find((p) => p.v === t.priority)?.l}</Badge>
                      <Badge variant="outline">{STATUSES.find((s) => s.v === t.status)?.l}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {owner ? `Responsável: ${owner.full_name}` : "Sem responsável"} {t.due_date && `• Prazo: ${format(new Date(t.due_date + "T00:00"), "dd/MM/yyyy")}`}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {t.description && <p className="text-sm">{t.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => del.mutate(t.id)}>Excluir</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
