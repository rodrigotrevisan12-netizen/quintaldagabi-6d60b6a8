import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Paperclip, Send } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      const payload = {
        ...form, author_id: me!.userId,
        recipient_id: form.is_broadcast ? null : (form.recipient_id || null),
      };
      const { data, error } = await supabase.from("internal_communications").insert(payload).select().single();
      if (error) throw error;
      if (file && data) {
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

  const filtered = list?.filter((c: any) => filter === "all" || c.comm_type === filter) ?? [];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-semibold">Comunicação interna</h1>
          <p className="text-sm text-muted-foreground">Avisos, comunicados, solicitações, ocorrências e mensagens.</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova</Button>
      </header>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Tudo</TabsTrigger>
          {TYPES.map((t) => <TabsTrigger key={t.v} value={t.v}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {filtered.map((c: any) => (
          <Card key={c.id}><CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <Badge>{c.comm_type}</Badge>
              {c.priority !== "normal" && <Badge variant="destructive">{c.priority}</Badge>}
              {c.is_broadcast && <Badge variant="outline">para todos</Badge>}
              <span className="ml-auto text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <p className="font-medium">{c.title}</p>
            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            {c.attachments?.map((a: any) => (
              <a key={a.id} href={a.file_url} target="_blank" className="inline-flex items-center gap-1 text-xs text-primary underline">
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
