import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GraduationCap, Award, CheckCircle2 } from "lucide-react";

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

export const Route = createFileRoute("/_authenticated/app/treinamento")({
  head: () => ({ meta: [{ title: "Treinamento — Quintal da Gabi" }] }),
  component: Training,
});

const TYPES = ["video", "pdf", "procedimento", "checklist", "foto", "link"] as const;

function Training() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.roles.includes("admin");
  const [tab, setTab] = useState("cursos");

  return (
    <div className="space-y-4">
      <header><h1 className="font-display text-2xl font-semibold">Treinamento</h1>
        <p className="text-sm text-muted-foreground">Cursos, materiais, certificados internos e trilha de integração.</p></header>

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
  const { data: me } = useCurrentUser();
  const { data } = useQuery({
    queryKey: ["my-progress", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => (await supabase.from("training_progress")
      .select("*, training_courses(title, category)").eq("user_id", me!.userId)).data ?? [],
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
            {p.certificate_code && <Badge><Award className="mr-1 h-3 w-3" />{p.certificate_code}</Badge>}
          </CardContent></Card>
        ))}
    </div>
  );
}
