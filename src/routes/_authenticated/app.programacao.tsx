import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, CheckCircle2, XCircle, Clock, Camera, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/programacao")({
  head: () => ({ meta: [{ title: "Programação do Dia — Quintal da Gabi" }] }),
  component: ProgramacaoPage,
});

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

function ProgramacaoPage() {
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Programação do Dia</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Crie e acompanhe todas as tarefas." : "Suas tarefas do dia."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          {isAdmin && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />Nova tarefa
            </Button>
          )}
        </div>
      </header>

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
          <SheetDescription>{format(new Date(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}</SheetDescription>
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
