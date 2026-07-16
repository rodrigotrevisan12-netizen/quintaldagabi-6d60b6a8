import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, UserPlus, Loader2, Link2, ShieldOff,
  ListChecks, CheckCircle2, XCircle, Clock, Camera, Award,
  UserCog, GraduationCap,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCanDelete } from "@/hooks/use-can-delete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { inviteEmployee } from "@/lib/employees.functions";
import { getPasswordSetupLink, revokeEmployeeAccess } from "@/lib/access.functions";

export const Route = createFileRoute("/_authenticated/app/funcionarios")({
  head: () => ({ meta: [{ title: "Equipe — Quintal da Gabi" }] }),
  component: EquipePage,
});

function EquipePage() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.primaryRole === "admin";

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground">
          Funcionários, tarefas, programação do dia e treinamento — tudo sobre o time em um só lugar.
        </p>
      </header>

      <Tabs defaultValue={isAdmin ? "funcionarios" : "tarefas"}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {isAdmin && (
            <TabsTrigger value="funcionarios"><UserCog className="mr-1.5 h-4 w-4" />Funcionários</TabsTrigger>
          )}
          <TabsTrigger value="tarefas"><ListChecks className="mr-1.5 h-4 w-4" />Tarefas</TabsTrigger>
          <TabsTrigger value="programacao"><Clock className="mr-1.5 h-4 w-4" />Programação do dia</TabsTrigger>
          <TabsTrigger value="treinamento"><GraduationCap className="mr-1.5 h-4 w-4" />Treinamento</TabsTrigger>
        </TabsList>
        {isAdmin && (
          <TabsContent value="funcionarios" className="mt-4"><FuncionariosTab /></TabsContent>
        )}
        <TabsContent value="tarefas" className="mt-4"><TarefasTab /></TabsContent>
        <TabsContent value="programacao" className="mt-4"><ProgramacaoTab /></TabsContent>
        <TabsContent value="treinamento" className="mt-4"><TreinamentoTab /></TabsContent>
      </Tabs>
    </div>
  );
}

const ROLES = [
  { v: "tosador", label: "Tosador(a)", perms: { banho_tosa: true, agenda: true, programacao: true } },
  { v: "banhista", label: "Banhista", perms: { banho_tosa: true, programacao: true } },
  { v: "recepcionista", label: "Recepcionista", perms: { agenda: true, tutores: true, chegadas: true, programacao: true } },
  { v: "cuidador", label: "Cuidador(a)", perms: { agenda: true, hospedagem: true, programacao: true, boletins: true } },
  { v: "gerente", label: "Gerente", perms: { agenda: true, tutores: true, hospedagem: true, banho_tosa: true, programacao: true, boletins: true, documentos: true, financeiro: true } },
  { v: "veterinario", label: "Veterinário(a)", perms: { saude: true, caes: true } },
  { v: "outro", label: "Outro", perms: {} },
] as const;

const MODULES = ["agenda", "programacao", "tutores", "caes", "hospedagem", "banho_tosa", "boletins", "documentos", "financeiro", "saude", "chegadas"];

type Emp = any;

function FuncionariosTab() {
  const qc = useQueryClient();
  const canDelete = useCanDelete();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Emp | null>(null);
  const invite = useServerFn(inviteEmployee);
  const copyLink = useServerFn(getPasswordSetupLink);
  const revoke = useServerFn(revokeEmployeeAccess);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const { data: list } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await supabase.from("employees").select("*").order("full_name")).data ?? [],
  });

  function emptyForm() {
    return { full_name: "", job_role: "outro", phone: "", email: "", hired_at: "", active: true, permissions: {}, notes: "", salary: "", work_schedule: "", contract_type: "clt" };
  }
  const [form, setForm] = useState<any>(emptyForm());

  function startEdit(e: Emp | null) {
    setEditing(e);
    setForm(e ? { ...e, hired_at: e.hired_at ?? "" } : emptyForm());
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, hired_at: form.hired_at || null, salary: form.salary === "" || form.salary == null ? null : Number(form.salary), work_schedule: form.work_schedule || null, contract_type: form.contract_type || "clt" };
      if (editing) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editing.id);
        if (error) throw error;
        // Se tem email e ainda não tem acesso, cria automaticamente
        if (payload.email && !editing.user_id) {
          try {
            const r = await invite({ data: { employeeId: editing.id, email: payload.email } });
            toast.success(r.message);
          } catch (e: any) { toast.error("Salvo, mas não consegui criar acesso: " + e.message); }
        }
      } else {
        const { data, error } = await supabase.from("employees").insert(payload).select("id").single();
        if (error) throw error;
        if (payload.email && data?.id) {
          try {
            const r = await invite({ data: { employeeId: data.id, email: payload.email } });
            toast.success(r.message);
          } catch (e: any) { toast.error("Funcionário criado, mas não consegui criar acesso: " + e.message); }
        }
      }
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["employees"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("employees").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["employees"] }); },
  });

  async function resendInvite(e: Emp) {
    if (!e.email) { toast.error("Funcionário sem e-mail."); return; }
    setInvitingId(e.id);
    try {
      const r = await invite({ data: { employeeId: e.id, email: e.email } });
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) { toast.error(err.message); }
    finally { setInvitingId(null); }
  }

  async function copyPwLink(e: Emp) {
    if (!e.email) { toast.error("Sem e-mail."); return; }
    try {
      const { url } = await copyLink({ data: { email: e.email } });
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! Envie por WhatsApp para o funcionário.");
    } catch (err: any) { toast.error(err.message); }
  }

  async function revokeAccess(e: Emp) {
    if (!confirm(`Remover o acesso de ${e.full_name}? Isso apaga o login dele.`)) return;
    try {
      await revoke({ data: { employeeId: e.id } });
      toast.success("Acesso removido.");
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) { toast.error(err.message); }
  }

  function applyRolePreset(role: string) {
    const preset = ROLES.find((r) => r.v === role)?.perms ?? {};
    setForm((f: any) => ({ ...f, job_role: role, permissions: { ...preset } }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Cadastro com cargo, permissões e criação automática de acesso ao app.</p>
        <Button onClick={() => startEdit(null)}><Plus className="mr-2 h-4 w-4" />Novo</Button>
      </div>

      <div className="grid gap-2">
        {list?.map((e: Emp) => (
          <Card key={e.id}><CardContent className="flex items-center justify-between p-4 gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">
                {e.full_name}{" "}
                {!e.active && <Badge variant="outline">inativo</Badge>}
                {e.user_id && <Badge variant="secondary" className="ml-1 text-[10px]">acesso liberado</Badge>}
              </p>
              <p className="text-xs text-muted-foreground truncate">{ROLES.find((r) => r.v === e.job_role)?.label} · {e.contract_type === "pj" ? "PJ" : "CLT"} · {e.email ?? "—"} · {e.phone ?? "—"}</p>
            </div>
            <div className="flex flex-wrap gap-1 shrink-0">
              {e.email && (
                <Button size="sm" variant="outline" onClick={() => resendInvite(e)} disabled={invitingId === e.id}>
                  {invitingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span className="ml-1 hidden sm:inline">{e.user_id ? "Reenviar acesso" : "Criar acesso"}</span>
                </Button>
              )}
              {e.email && (
                <Button size="sm" variant="outline" onClick={() => copyPwLink(e)} title="Copiar link de definição de senha">
                  <Link2 className="h-4 w-4" /><span className="ml-1 hidden sm:inline">Copiar link</span>
                </Button>
              )}
              {e.user_id && (
                <Button size="sm" variant="outline" onClick={() => revokeAccess(e)} title="Remover acesso ao app">
                  <ShieldOff className="h-4 w-4" /><span className="ml-1 hidden sm:inline">Remover acesso</span>
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => startEdit(e)}><Pencil className="h-4 w-4" /></Button>
              {canDelete && (
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) del.mutate(e.id); }}><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
          </CardContent></Card>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{editing ? "Editar" : "Novo"} funcionário</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            <div><Label>Nome</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Cargo</Label>
              <Select value={form.job_role} onValueChange={applyRolePreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Ao salvar com e-mail, o acesso ao app é criado e o link de senha é enviado por e-mail.</p>
            <div><Label>Data de admissão</Label><Input type="date" value={form.hired_at ?? ""} onChange={(e) => setForm({ ...form, hired_at: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Salário (R$)</Label><Input type="number" step="0.01" min="0" value={form.salary ?? ""} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
              <div>
                <Label>Tipo de contrato</Label>
                <Select value={form.contract_type ?? "clt"} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clt">CLT (com encargos)</SelectItem>
                    <SelectItem value="pj">PJ / Autônomo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Jornada de trabalho</Label><Input value={form.work_schedule ?? ""} onChange={(e) => setForm({ ...form, work_schedule: e.target.value })} placeholder="Ex: Seg-Sex 08h-17h" /></div>
            </div>
            <div className="space-y-2">
              <Label>Permissões individuais (ajustes finos)</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {MODULES.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm capitalize">
                    <Checkbox
                      checked={!!form.permissions?.[m]}
                      onCheckedChange={(v) => setForm({ ...form, permissions: { ...form.permissions, [m]: !!v } })}
                    /> {m.replace("_", " & ")}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} />
              <Label>Ativo</Label>
            </div>
            <div><Label>Notas</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <SheetFooter className="mt-4"><Button onClick={() => save.mutate()} disabled={save.isPending || !form.full_name}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
const PRIORITIES = [{ v: "baixa", l: "Baixa" }, { v: "normal", l: "Normal" }, { v: "alta", l: "Alta" }, { v: "urgente", l: "Urgente" }];
const STATUSES = [{ v: "pendente", l: "Pendente" }, { v: "em_andamento", l: "Em andamento" }, { v: "concluida", l: "Concluída" }, { v: "cancelada", l: "Cancelada" }];
const prioColor: Record<string, any> = { baixa: "secondary", normal: "default", alta: "destructive", urgente: "destructive" };

function TarefasTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"abertas" | "todas" | "concluidas">("abertas");
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", due_date: "", priority: "normal" });

  const employeesQ = useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => { const { data, error } = await supabase.from("employees").select("id,user_id,full_name").eq("active", true).order("full_name"); if (error) throw error; return data ?? []; },
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-muted-foreground">Lista de tarefas operacionais com responsável, prazo e status.</p>
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
                      <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.user_id ?? e.id}>{e.full_name}{!e.user_id && " (sem acesso)"}</SelectItem>)}</SelectContent>
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
      </div>

      {q.isLoading ? <p>Carregando…</p> : (q.data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><ListChecks className="mx-auto mb-2 h-8 w-8" />Nenhuma tarefa.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {(q.data ?? []).map((t: any) => {
            const owner = employees.find((e) => e.user_id === t.assigned_to || e.id === t.assigned_to);
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
type Item = {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  activity: string;
  description: string | null;
  responsible_id: string | null;
  location: string | null;
  requires_photo: boolean;
  requires_confirmation: boolean;
  status: "pending" | "done" | "not_done";
  notes: string | null;
  not_done_reason: string | null;
  responsible: { full_name: string | null } | null;
};

function ProgramacaoTab() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.primaryRole === "admin";
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [creating, setCreating] = useState(false);
  const [notDone, setNotDone] = useState<Item | null>(null);

  const itemsQuery = useQuery({
    queryKey: ["schedule", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_schedule_items")
        .select("id,date,start_time,end_time,activity,description,responsible_id,location,requires_photo,requires_confirmation,status,notes,not_done_reason,responsible:profiles(full_name)")
        .eq("date", date)
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as unknown as Item[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: Item["status"]; reason?: string }) => {
      const patch: any = { status };
      if (status === "done") {
        patch.completed_at = new Date().toISOString();
        const { data: user } = await supabase.auth.getUser();
        patch.completed_by = user.user?.id;
      }
      if (status === "not_done") patch.not_done_reason = reason ?? null;
      const { error } = await supabase.from("daily_schedule_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delItem = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("daily_schedule_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Tarefa removida."); qc.invalidateQueries({ queryKey: ["schedule"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(() => {
    const items = itemsQuery.data ?? [];
    return {
      total: items.length,
      done: items.filter((i) => i.status === "done").length,
      pending: items.filter((i) => i.status === "pending").length,
      not_done: items.filter((i) => i.status === "not_done").length,
    };
  }, [itemsQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Crie e acompanhe todas as tarefas." : "Suas tarefas do dia."}
        </p>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          {isAdmin && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />Nova tarefa
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Concluídas" value={counts.done} />
        <StatCard label="Pendentes" value={counts.pending} />
        <StatCard label="Não realizadas" value={counts.not_done} />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {itemsQuery.isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (itemsQuery.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma tarefa para esta data.</div>
        ) : (
          <ul className="divide-y divide-border">
            {(itemsQuery.data ?? []).map((it) => (
              <li key={it.id} className="flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-[68px] font-mono text-sm">{it.start_time?.slice(0, 5)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{it.activity}</p>
                    <StatusBadge status={it.status} />
                    {it.requires_photo && <Badge variant="outline" className="gap-1"><Camera className="h-3 w-3" />foto</Badge>}
                    {it.requires_confirmation && <Badge variant="outline">confirmação</Badge>}
                  </div>
                  {it.description && <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {it.responsible?.full_name ? `Resp: ${it.responsible.full_name}` : "Sem responsável"}
                    {it.location ? ` · ${it.location}` : ""}
                  </p>
                  {it.status === "not_done" && it.not_done_reason && (
                    <p className="mt-1 text-xs text-destructive">Motivo: {it.not_done_reason}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={it.status === "done" ? "default" : "outline"}
                    onClick={() => setStatus.mutate({ id: it.id, status: "done" })}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant={it.status === "pending" ? "default" : "outline"}
                    onClick={() => setStatus.mutate({ id: it.id, status: "pending" })}>
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant={it.status === "not_done" ? "destructive" : "outline"}
                    onClick={() => setNotDone(it)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="ghost"
                      onClick={() => { if (confirm("Excluir tarefa?")) delItem.mutate(it.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateItemSheet open={creating} date={date} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["schedule"] }); }} />

      <Dialog open={!!notDone} onOpenChange={(o) => !o && setNotDone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como não realizada</DialogTitle>
            <DialogDescription>Informe o motivo. Será registrado no histórico.</DialogDescription>
          </DialogHeader>
          <ReasonForm onSubmit={(reason) => {
            if (notDone) setStatus.mutate({ id: notDone.id, status: "not_done", reason });
            setNotDone(null);
          }} onCancel={() => setNotDone(null)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Item["status"] }) {
  if (status === "done") return <Badge>Concluído</Badge>;
  if (status === "not_done") return <Badge variant="destructive">Não realizado</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

function ReasonForm({ onSubmit, onCancel }: { onSubmit: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo..." />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSubmit(reason)} disabled={!reason.trim()}>Confirmar</Button>
      </DialogFooter>
    </>
  );
}

function CreateItemSheet({ open, date, onClose, onCreated }: { open: boolean; date: string; onClose: () => void; onCreated: () => void }) {
  const [activity, setActivity] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [responsibleId, setResponsibleId] = useState<string>("");
  const [location, setLocation] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const staffQuery = useQuery({
    queryKey: ["staff-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, user_id, full_name")
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return (data ?? []).map((e: any) => ({ id: e.user_id ?? e.id, full_name: e.full_name, has_access: !!e.user_id }));
    },
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!activity.trim()) throw new Error("Atividade obrigatória.");
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("daily_schedule_items").insert({
        date, start_time: startTime, end_time: endTime || null, activity, description: description || null,
        responsible_id: responsibleId || null, location: location || null,
        requires_photo: requiresPhoto, requires_confirmation: requiresConfirmation,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tarefa criada."); onCreated(); setActivity(""); setDescription(""); setLocation(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nova tarefa</SheetTitle>
          <SheetDescription>{format(new Date(`${date}T12:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR })}</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Início</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div className="space-y-2"><Label>Fim</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Atividade</Label><Input value={activity} onChange={(e) => setActivity(e.target.value)} /></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={responsibleId} onValueChange={setResponsibleId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(staffQuery.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? "—"}{!p.has_access && " (sem acesso)"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Local</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={requiresPhoto} onCheckedChange={(v) => setRequiresPhoto(!!v)} /> Exige foto</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={requiresConfirmation} onCheckedChange={(v) => setRequiresConfirmation(!!v)} /> Exige confirmação</label>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
const TYPES = ["video", "pdf", "procedimento", "checklist", "foto", "link"] as const;

function TreinamentoTab() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.roles.includes("admin");
  const [tab, setTab] = useState("cursos");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="cursos">Cursos</TabsTrigger>
          <TabsTrigger value="integracao">Integração</TabsTrigger>
          <TabsTrigger value="meu">Meu progresso</TabsTrigger>
        </TabsList>
        <TabsContent value="cursos"><CourseList isAdmin={!!isAdmin} onlyOnboarding={false} /></TabsContent>
        <TabsContent value="integracao"><CourseList isAdmin={!!isAdmin} onlyOnboarding /></TabsContent>
        <TabsContent value="meu"><MyProgress /></TabsContent>
      </Tabs>
    </div>
  );
}

function CourseList({ isAdmin, onlyOnboarding }: { isAdmin: boolean; onlyOnboarding: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ title: "", description: "", category: "", required: false, is_onboarding: onlyOnboarding });
  const [selected, setSelected] = useState<string | null>(null);

  const { data: courses } = useQuery({
    queryKey: ["courses", onlyOnboarding],
    queryFn: async () => {
      let q = supabase.from("training_courses").select("*").eq("active", true).order("order_index");
      if (onlyOnboarding) q = q.eq("is_onboarding", true);
      return (await q).data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) { const { error } = await supabase.from("training_courses").update(form).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("training_courses").insert({ ...form, is_onboarding: onlyOnboarding ? true : form.is_onboarding }); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courses"] }); toast.success("Salvo"); setOpen(false); },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("training_courses").update({ active: false }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });

  function startEdit(c: any) { setEditing(c); setForm(c ?? { title: "", description: "", category: "", required: false, is_onboarding: onlyOnboarding }); setOpen(true); }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <Button onClick={() => startEdit(null)}><Plus className="mr-2 h-4 w-4" />Novo curso</Button>
      )}
      <div className="grid gap-2">
        {courses?.map((c: any) => (
          <Card key={c.id} className={selected === c.id ? "border-primary" : ""}>
            <CardContent className="flex items-center justify-between p-4">
              <button className="flex-1 text-left" onClick={() => setSelected(selected === c.id ? null : c.id)}>
                <p className="font-medium">{c.title} {c.required && <Badge variant="outline">obrigatório</Badge>}</p>
                <p className="text-xs text-muted-foreground">{c.category ?? "—"}</p>
                {c.description && <p className="mt-1 text-sm">{c.description}</p>}
              </button>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Arquivar?")) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </CardContent>
            {selected === c.id && <CourseMaterials courseId={c.id} isAdmin={isAdmin} />}
          </Card>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{editing ? "Editar" : "Novo"} curso</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Categoria</Label><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <label className="flex items-center gap-2"><Checkbox checked={form.required} onCheckedChange={(v) => setForm({ ...form, required: !!v })} /> Obrigatório</label>
            {!onlyOnboarding && (
              <label className="flex items-center gap-2"><Checkbox checked={form.is_onboarding} onCheckedChange={(v) => setForm({ ...form, is_onboarding: !!v })} /> Trilha de integração</label>
            )}
          </div>
          <SheetFooter className="mt-4"><Button onClick={() => save.mutate()} disabled={!form.title}>Salvar</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CourseMaterials({ courseId, isAdmin }: { courseId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [adding, setAdding] = useState(false);
  const [m, setM] = useState<any>({ title: "", material_type: "video", content: "", file_url: "" });

  const { data: materials } = useQuery({
    queryKey: ["materials", courseId],
    queryFn: async () => (await supabase.from("training_materials").select("*").eq("course_id", courseId).order("order_index")).data ?? [],
  });

  const { data: prog } = useQuery({
    queryKey: ["progress", courseId, me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => (await supabase.from("training_progress").select("*").eq("course_id", courseId).eq("user_id", me!.userId).maybeSingle()).data,
  });

  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("training_materials").insert({ ...m, course_id: courseId }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["materials", courseId] }); setAdding(false); setM({ title: "", material_type: "video", content: "", file_url: "" }); },
  });

  const complete = useMutation({
    mutationFn: async () => {
      const code = `CERT-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("training_progress").upsert({
        course_id: courseId, user_id: me!.userId, completed: true, completed_at: new Date().toISOString(),
        certificate_issued: true, certificate_code: code, views: (prog?.views ?? 0) + 1,
      }, { onConflict: "course_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Curso concluído! Certificado emitido."); qc.invalidateQueries({ queryKey: ["progress"] }); },
  });

  const trackView = useMutation({
    mutationFn: async () => {
      await supabase.from("training_progress").upsert({
        course_id: courseId, user_id: me!.userId, views: (prog?.views ?? 0) + 1,
        completed: prog?.completed ?? false,
      }, { onConflict: "course_id,user_id" });
    },
  });

  return (
    <CardContent className="space-y-2 border-t pt-3">
      {materials?.map((mat: any) => (
        <div key={mat.id} className="rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium">{mat.title} <Badge variant="outline">{mat.material_type}</Badge></p>
            {mat.file_url && <a href={mat.file_url} target="_blank" className="text-xs text-primary underline" onClick={() => trackView.mutate()}>Abrir</a>}
          </div>
          {mat.content && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{mat.content}</p>}
        </div>
      ))}

      {isAdmin && (
        adding ? (
          <div className="space-y-2 rounded-md border p-3">
            <Input placeholder="Título" value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} />
            <Select value={m.material_type} onValueChange={(v) => setM({ ...m, material_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="URL (vídeo/PDF/link/foto)" value={m.file_url} onChange={(e) => setM({ ...m, file_url: e.target.value })} />
            <Textarea placeholder="Conteúdo (procedimento/checklist)" value={m.content} onChange={(e) => setM({ ...m, content: e.target.value })} />
            <div className="flex gap-2"><Button size="sm" onClick={() => add.mutate()}>Adicionar</Button><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button></div>
          </div>
        ) : <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="mr-1 h-3 w-3" />Material</Button>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">Visualizações: {prog?.views ?? 0}{prog?.completed && " · ✅ concluído"}</p>
        {!prog?.completed ? (
          <Button size="sm" onClick={() => complete.mutate()}><CheckCircle2 className="mr-1 h-3 w-3" />Marcar concluído</Button>
        ) : prog.certificate_code && (
          <Badge><Award className="mr-1 h-3 w-3" />{prog.certificate_code}</Badge>
        )}
      </div>
    </CardContent>
  );
}

function MyProgress() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data } = useQuery({
    queryKey: ["my-progress", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => (await supabase.from("training_progress")
      .select("*, training_courses(title, category)").eq("user_id", me!.userId)).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("training_progress").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Progresso removido"); qc.invalidateQueries({ queryKey: ["my-progress"] }); },
  });
  return (
    <div className="space-y-2">
      {!data?.length ? <p className="text-sm text-muted-foreground">Nenhum curso iniciado.</p> :
        data.map((p: any) => (
          <Card key={p.id}><CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{p.training_courses?.title}</p>
              <p className="text-xs text-muted-foreground">Visualizações: {p.views} · {p.completed ? "concluído" : "em andamento"}</p>
            </div>
            <div className="flex items-center gap-2">
              {p.certificate_code && <Badge><Award className="mr-1 h-3 w-3" />{p.certificate_code}</Badge>}
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Apagar progresso?")) del.mutate(p.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent></Card>
        ))}
    </div>
  );
}
