import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, Send, Trash2, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/boletins")({
  head: () => ({ meta: [{ title: "Boletins — Quintal da Gabi" }] }),
  component: BoletinsPage,
});

type Report = {
  id: string;
  dog_id: string;
  date: string;
  summary: string | null;
  published: boolean;
  dog: { name: string } | null;
};

const ENTRY_TYPES: Array<{ value: string; label: string }> = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "hidratacao", label: "Hidratação" },
  { value: "brincadeira", label: "Brincadeira" },
  { value: "passeio", label: "Passeio" },
  { value: "descanso", label: "Descanso" },
  { value: "comportamento", label: "Comportamento" },
];

function BoletinsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [opened, setOpened] = useState<Report | null>(null);

  const reportsQuery = useQuery({
    queryKey: ["daily-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_reports")
        .select("id,dog_id,date,summary,published,dog:dogs(name)")
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Report[];
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Boletins diários</h1>
          <p className="text-sm text-muted-foreground">Registre atividades, alimentação e fotos do dia.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Novo boletim</Button>
      </header>

      <div className="rounded-2xl border border-border bg-card">
        {reportsQuery.isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (reportsQuery.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum boletim ainda.</div>
        ) : (
          <ul className="divide-y divide-border">
            {(reportsQuery.data ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                <button onClick={() => setOpened(r)} className="flex-1 text-left">
                  <p className="font-medium">{r.dog?.name ?? "—"} · {format(new Date(r.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                  {r.summary && <p className="text-sm text-muted-foreground">{r.summary}</p>}
                </button>
                <Badge variant={r.published ? "default" : "secondary"}>{r.published ? "Publicado" : "Rascunho"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateReportSheet open={creating} onClose={() => setCreating(false)}
        onCreated={(r) => { setCreating(false); qc.invalidateQueries({ queryKey: ["daily-reports"] }); setOpened(r); }} />

      <ReportDetail report={opened} onClose={() => setOpened(null)} onChanged={() => qc.invalidateQueries({ queryKey: ["daily-reports"] })} />
    </div>
  );
}

function CreateReportSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (r: Report) => void }) {
  const [dogId, setDogId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [summary, setSummary] = useState("");

  const dogsQuery = useQuery({
    queryKey: ["dogs-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dogs").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!dogId) throw new Error("Selecione um cão.");
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("daily_reports").insert({
        dog_id: dogId, date, summary: summary || null, author_id: user.user?.id,
      }).select("id,dog_id,date,summary,published,dog:dogs(name)").single();
      if (error) throw error;
      return data as unknown as Report;
    },
    onSuccess: (r) => { toast.success("Boletim criado."); setDogId(""); setSummary(""); onCreated(r); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function generateAuto() {
    if (!dogId) { toast.error("Selecione um cão."); return; }
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const [{ data: dStay }, { data: bStay }] = await Promise.all([
      supabase.from("daycare_stays").select("id").eq("dog_id", dogId).gte("check_in_at", dayStart).lte("check_in_at", dayEnd).limit(1),
      supabase.from("boarding_stays").select("id").eq("dog_id", dogId).lte("check_in_at", dayEnd).or(`check_out_at.gte.${dayStart},check_out_at.is.null`).limit(1),
    ]);
    const dayStayIds = (dStay ?? []).map((s: any) => s.id);
    const bStayIds = (bStay ?? []).map((s: any) => s.id);

    const [feedings, activities, meds] = await Promise.all([
      dayStayIds.length ? supabase.from("daycare_feedings").select("*").in("stay_id", dayStayIds) : Promise.resolve({ data: [] }),
      dayStayIds.length ? supabase.from("daycare_activities").select("*").in("stay_id", dayStayIds) : Promise.resolve({ data: [] }),
      dayStayIds.length ? supabase.from("daycare_medications").select("*").in("stay_id", dayStayIds) : Promise.resolve({ data: [] }),
    ]);

    const { data: user } = await supabase.auth.getUser();
    const { data: report, error: rErr } = await supabase.from("daily_reports").insert({
      dog_id: dogId, date, summary: summary || "Boletim gerado automaticamente", author_id: user.user?.id,
    }).select("id,dog_id,date,summary,published,dog:dogs(name)").single();
    if (rErr) { toast.error(rErr.message); return; }
    const entries: any[] = [];
    for (const f of (feedings.data ?? []) as any[]) {
      entries.push({ report_id: (report as any).id, entry_type: "alimentacao",
        occurred_at: f.fed_at ?? f.created_at, description: f.food_type ?? "Alimentação", notes: f.notes });
    }
    for (const a of (activities.data ?? []) as any[]) {
      const t = a.activity_type;
      const map: Record<string, string> = { passeio: "passeio", brincadeira: "brincadeira", soneca: "descanso" };
      entries.push({ report_id: (report as any).id, entry_type: map[t] ?? "brincadeira",
        occurred_at: a.occurred_at ?? a.created_at, description: a.activity_type, notes: a.notes });
    }
    if (entries.length) await supabase.from("daily_report_entries").insert(entries);

    toast.success(`Boletim gerado com ${entries.length} registro(s).`);
    onCreated(report as unknown as Report);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Novo boletim</SheetTitle>
          <SheetDescription>Criar manualmente ou gerar automaticamente a partir do dia.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 py-4">
          <div className="space-y-2">
            <Label>Cão</Label>
            <Select value={dogId} onValueChange={setDogId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(dogsQuery.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Resumo (opcional)</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} /></div>
        </div>
        <SheetFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={generateAuto}>Gerar automático</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar vazio
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ReportDetail({ report, onClose, onChanged }: { report: Report | null; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState("alimentacao");
  const [desc, setDesc] = useState("");
  const [notes, setNotes] = useState("");

  const entriesQuery = useQuery({
    queryKey: ["report-entries", report?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_report_entries").select("*").eq("report_id", report!.id).order("occurred_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!report,
  });

  const mediaQuery = useQuery({
    queryKey: ["report-media", report?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_report_media").select("*").eq("report_id", report!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!report,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!desc.trim()) throw new Error("Descrição obrigatória.");
      const { error } = await supabase.from("daily_report_entries").insert({
        report_id: report!.id, entry_type: type, description: desc, notes: notes || null,
        occurred_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Adicionado."); setDesc(""); setNotes(""); qc.invalidateQueries({ queryKey: ["report-entries", report?.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daily_reports")
        .update({ published: true, published_at: new Date().toISOString() })
        .eq("id", report!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Boletim publicado."); onChanged(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteReport = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daily_reports").delete().eq("id", report!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido."); onChanged(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadFile(file: File) {
    if (!report) return;
    const ext = file.name.split(".").pop();
    const path = `${report.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("reports").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const mediaType = file.type.startsWith("video") ? "video" : "photo";
    const { error } = await supabase.from("daily_report_media").insert({
      report_id: report.id, media_url: path, media_type: mediaType,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["report-media", report.id] });
  }

  return (
    <Sheet open={!!report} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {report && (
          <>
            <SheetHeader>
              <SheetTitle>{report.dog?.name} · {format(new Date(report.date), "dd/MM/yyyy")}</SheetTitle>
              <SheetDescription>{report.published ? "Publicado" : "Rascunho — visível só para a equipe."}</SheetDescription>
            </SheetHeader>

            <section className="mt-4">
              <h3 className="mb-2 text-sm font-semibold">Registros</h3>
              <ul className="space-y-2">
                {(entriesQuery.data ?? []).map((e: any) => (
                  <li key={e.id} className="rounded-xl border border-border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ENTRY_TYPES.find((t) => t.value === e.entry_type)?.label ?? e.entry_type}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(e.occurred_at), "HH:mm")}</span>
                    </div>
                    <p className="mt-1">{e.description}</p>
                    {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                  </li>
                ))}
              </ul>

              <div className="mt-3 space-y-2 rounded-xl border border-dashed border-border p-3">
                <Label>Adicionar registro</Label>
                <div className="flex gap-2">
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTRY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} />
                </div>
                <Textarea placeholder="Observação (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                <Button size="sm" onClick={() => addEntry.mutate()} disabled={addEntry.isPending}>
                  <Plus className="mr-2 h-4 w-4" />Adicionar
                </Button>
              </div>
            </section>

            <section className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Fotos e vídeos</h3>
              <div className="grid grid-cols-3 gap-2">
                {(mediaQuery.data ?? []).map((m: any) => (
                  <ReportMediaThumb key={m.id} path={m.media_url} type={m.media_type} />
                ))}
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:bg-muted/40">
                  <ImageIcon className="h-6 w-6" />
                  <input type="file" accept="image/*,video/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.currentTarget.value = ""; }} />
                </label>
              </div>
            </section>

            <SheetFooter className="mt-6">
              <Button variant="ghost" onClick={() => deleteReport.mutate()} disabled={deleteReport.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />Remover
              </Button>
              {!report.published && (
                <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
                  <Send className="mr-2 h-4 w-4" />Publicar para o tutor
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ReportMediaThumb({ path, type }: { path: string; type: string }) {
  const { data: url } = useQuery({
    queryKey: ["report-media-url", path],
    queryFn: async () => {
      const { data } = await supabase.storage.from("reports").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
  });
  if (!url) return <div className="aspect-square rounded-xl bg-muted" />;
  if (type === "video") return <video src={url} className="aspect-square rounded-xl object-cover" controls />;
  return <img src={url} alt="" className="aspect-square rounded-xl object-cover" />;
}
