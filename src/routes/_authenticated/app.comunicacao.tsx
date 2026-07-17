import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Paperclip, Send, Trash2, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { validateFile, ATTACHMENT_TYPES } from "@/lib/file-validation";

export const Route = createFileRoute("/_authenticated/app/comunicacao")({
  head: () => ({ meta: [{ title: "Comunicação — Quintal da Gabi" }] }),
  component: Comms,
});

const TYPES = [
  { v: "aviso", label: "Aviso" },
  { v: "comunicado", label: "Comunicado" },
  { v: "solicitacao", label: "Solicitação" },
  { v: "ocorrencia", label: "Ocorrência" },
  { v: "mensagem", label: "Mensagem" },
] as const;

function Comms() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Comunicação interna</h1>
        <p className="text-sm text-muted-foreground">Chat da equipe, avisos/comunicados e ocorrências.</p>
      </header>

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Chat da equipe</TabsTrigger>
          <TabsTrigger value="avisos">Avisos & comunicados</TabsTrigger>
          <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
        </TabsList>
        <TabsContent value="chat"><TeamChat /></TabsContent>
        <TabsContent value="avisos"><Announcements /></TabsContent>
        <TabsContent value="ocorrencias"><OcorrenciasTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function TeamChat() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["chat_messages"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("chat_messages")
        .select("*").order("created_at", { ascending: true }).limit(500);
      return data ?? [];
    },
    refetchOnWindowFocus: true,
  });

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("chat_messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" },
        () => qc.invalidateQueries({ queryKey: ["chat_messages"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Mapa de nomes dos autores — prioriza nome cadastrado em "funcionários"
  const { data: nameMap } = useQuery({
    queryKey: ["chat-authors", messages?.length],
    enabled: !!messages?.length,
    queryFn: async () => {
      const ids = Array.from(new Set((messages ?? []).map((m: any) => m.author_id as string))) as string[];
      if (!ids.length) return {};
      const [{ data: emps }, { data: profs }] = await Promise.all([
        supabase.from("employees").select("user_id, full_name").in("user_id", ids),
        supabase.from("profiles").select("id, full_name").in("id", ids),
      ]);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { if (p.full_name) map[p.id] = p.full_name; });
      (emps ?? []).forEach((e: any) => { if (e.full_name) map[e.user_id] = e.full_name; });
      return map;
    },
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      let attachment_url: string | null = null;
      let attachment_name: string | null = null;
      if (file) {
        const invalid = validateFile(file, { maxSizeMB: 15, allowedTypes: ATTACHMENT_TYPES });
        if (invalid) throw new Error(invalid);
        const path = `chat/${Date.now()}-${file.name}`;
        const up = await supabase.storage.from("comms").upload(path, file);
        if (up.error) throw up.error;
        const { data: signed } = await supabase.storage.from("comms").createSignedUrl(path, 60 * 60 * 24 * 365);
        attachment_url = signed?.signedUrl ?? null;
        attachment_name = file.name;
      }
      const { error } = await (supabase as any).from("chat_messages").insert({
        author_id: me!.userId, body: body.trim(), attachment_url, attachment_name,
      });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); setFile(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("chat_messages").delete().eq("id", id); if (error) throw error; },
  });

  return (
    <Card>
      <CardContent className="flex h-[60vh] flex-col gap-3 p-3">
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto pr-1">
          {(messages ?? []).map((m: any) => {
            const mine = m.author_id === me?.userId;
            const name = nameMap?.[m.author_id] ?? "—";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`group max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p className="mb-1 text-[10px] opacity-70">{name} · {new Date(m.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  {m.attachment_url && (
                    <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs underline">
                      <Paperclip className="h-3 w-3" />{m.attachment_name}
                    </a>
                  )}
                  {mine && (
                    <button onClick={() => del.mutate(m.id)} className="ml-2 text-[10px] opacity-0 group-hover:opacity-70">apagar</button>
                  )}
                </div>
              </div>
            );
          })}
          {!messages?.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Diga oi!</p>}
        </div>
        <div className="flex items-end gap-2 border-t pt-2">
          <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mensagem para a equipe..." className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && body.trim()) { e.preventDefault(); send.mutate(); } }} />
          <label className="cursor-pointer rounded-md border p-2 hover:bg-accent">
            <Paperclip className="h-4 w-4" />
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <Button onClick={() => send.mutate()} disabled={!body.trim() || send.isPending}><Send className="h-4 w-4" /></Button>
        </div>
        {file && <p className="text-xs text-muted-foreground">Anexo: {file.name} <button className="underline" onClick={() => setFile(null)}>remover</button></p>}
      </CardContent>
    </Card>
  );
}

function Announcements() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ comm_type: "aviso", title: "", body: "", priority: "normal", is_broadcast: true, recipient_id: "" });
  const [file, setFile] = useState<File | null>(null);

  const { data: list } = useQuery({
    queryKey: ["comms"],
    queryFn: async () => {
      const { data } = await supabase.from("internal_communications")
        .select("*, attachments:internal_communication_attachments(*)")
        .order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["emp-list"],
    queryFn: async () => (await supabase.from("employees").select("user_id, full_name").not("user_id", "is", null)).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = { ...form, author_id: me!.userId, recipient_id: form.is_broadcast ? null : (form.recipient_id || null) };
      const { data, error } = await supabase.from("internal_communications").insert(payload).select().single();
      if (error) throw error;
      if (file && data) {
        const invalid = validateFile(file, { maxSizeMB: 15, allowedTypes: ATTACHMENT_TYPES });
        if (invalid) throw new Error(invalid);
        const path = `${data.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("comms").upload(path, file);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("comms").getPublicUrl(path);
          await supabase.from("internal_communication_attachments").insert({
            comm_id: data.id, file_url: urlData.publicUrl, file_name: file.name, mime_type: file.type,
          });
        }
      }
    },
    onSuccess: () => { toast.success("Enviado"); qc.invalidateQueries({ queryKey: ["comms"] }); setOpen(false); setFile(null); setForm({ comm_type: "aviso", title: "", body: "", priority: "normal", is_broadcast: true, recipient_id: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("internal_communications").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comms"] }),
  });

  const filtered = list?.filter((c: any) => filter === "all" || c.comm_type === filter) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">Tudo</TabsTrigger>
            {TYPES.map((t) => <TabsTrigger key={t.v} value={t.v}>{t.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo</Button>
      </div>

      <div className="space-y-2">
        {filtered.map((c: any) => (
          <Card key={c.id}><CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <Badge>{c.comm_type}</Badge>
              {c.priority !== "normal" && <Badge variant="destructive">{c.priority}</Badge>}
              {c.is_broadcast && <Badge variant="outline">para todos</Badge>}
              <span className="ml-auto text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <p className="font-medium">{c.title}</p>
            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            {c.attachments?.map((a: any) => (
              <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline">
                <Paperclip className="h-3 w-3" />{a.file_name}
              </a>
            ))}
          </CardContent></Card>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>Nova comunicação</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            <div><Label>Tipo</Label>
              <Select value={form.comm_type} onValueChange={(v) => setForm({ ...form, comm_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Mensagem</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <label className="flex items-center gap-2"><Checkbox checked={form.is_broadcast} onCheckedChange={(v) => setForm({ ...form, is_broadcast: !!v })} /> Enviar para toda a equipe</label>
            {!form.is_broadcast && (
              <div><Label>Destinatário</Label>
                <Select value={form.recipient_id} onValueChange={(v) => setForm({ ...form, recipient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{employees?.map((e: any) => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Anexo (opcional)</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          </div>
          <SheetFooter className="mt-4"><Button onClick={() => create.mutate()} disabled={!form.title || !form.body || create.isPending}><Send className="mr-2 h-4 w-4" />Enviar</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ocorrências (movido de /app/ocorrencias para uma aba aqui dentro) */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { v: "briga", l: "Briga" }, { v: "mal_estar", l: "Mal-estar" }, { v: "fuga", l: "Fuga" },
  { v: "machucado", l: "Machucado" }, { v: "comportamento", l: "Comportamento" },
  { v: "observacao", l: "Observação" }, { v: "outro", l: "Outro" },
];
const SEVERITIES = [
  { v: "baixa", l: "Baixa" }, { v: "media", l: "Média" }, { v: "alta", l: "Alta" }, { v: "urgente", l: "Urgente" },
];
const sevColor: Record<string, string> = { baixa: "secondary", media: "default", alta: "destructive", urgente: "destructive" };

function OcorrenciasTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const { data: me } = useCurrentUser();
  const isAdmin = me?.primaryRole === "admin";
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

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("occurrences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ocorrência excluída");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["occurrences"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-muted-foreground">Registro de eventos do dia (briga, mal-estar, fuga, machucado, observações).</p>
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
      </div>

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
                    {isAdmin && (
                      <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta ocorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.description ? `"${toDelete.description}". ` : ""}
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
