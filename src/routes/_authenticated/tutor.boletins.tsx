import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tutor/boletins")({
  head: () => ({ meta: [{ title: "Boletins — Quintal da Gabi" }] }),
  component: Boletins,
});

const ENTRY_LABEL: Record<string, string> = {
  alimentacao: "Alimentação",
  hidratacao: "Hidratação",
  brincadeira: "Brincadeira",
  passeio: "Passeio",
  descanso: "Descanso",
  comportamento: "Comportamento",
};

function Boletins() {
  const { data: me } = useCurrentUser();

  const { data: reports } = useQuery({
    queryKey: ["tutor-reports", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data: t } = await supabase.from("tutors").select("id").eq("user_id", me!.userId).maybeSingle();
      if (!t) return [];
      const { data: dogs } = await supabase.from("dogs").select("id, name").eq("tutor_id", t.id);
      const ids = (dogs ?? []).map((d) => d.id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("daily_reports")
        .select("id, date, dog_id, summary, published")
        .in("dog_id", ids).eq("published", true)
        .order("date", { ascending: false });
      const byDog = Object.fromEntries((dogs ?? []).map((d) => [d.id, d.name]));
      return (data ?? []).map((r) => ({ ...r, dog_name: byDog[r.dog_id] }));
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">Boletins</h1>
      {!reports?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum boletim publicado ainda.</p>
      ) : reports.map((r: any) => <ReportCard key={r.id} report={r} />)}
    </div>
  );
}

function ReportCard({ report }: { report: any }) {
  const [open, setOpen] = useState(false);

  const { data: entries } = useQuery({
    queryKey: ["tutor-report-entries", report.id],
    enabled: open,
    queryFn: async () => (await supabase
      .from("daily_report_entries").select("*").eq("report_id", report.id)
      .order("occurred_at")).data ?? [],
  });

  const { data: media } = useQuery({
    queryKey: ["tutor-report-media", report.id],
    enabled: open,
    queryFn: async () => (await supabase
      .from("daily_report_media").select("*").eq("report_id", report.id)).data ?? [],
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
          <div>
            <p className="font-medium">{report.dog_name}</p>
            <p className="text-xs text-muted-foreground">{new Date(report.date).toLocaleDateString("pt-BR")}</p>
          </div>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {report.summary && <p className="text-sm">{report.summary}</p>}

        {open && (
          <div className="space-y-4 pt-2">
            {entries?.length ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registros do dia</h3>
                <ul className="space-y-2">
                  {entries.map((e: any) => (
                    <li key={e.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{ENTRY_LABEL[e.entry_type] ?? e.entry_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(e.occurred_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="mt-1">{e.description}</p>
                      {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="text-xs text-muted-foreground">Sem registros adicionais.</p>
            )}

            {media && media.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fotos e vídeos</h3>
                <div className="grid grid-cols-3 gap-2">
                  {media.map((m: any) => <MediaThumb key={m.id} path={m.media_url} type={m.media_type} />)}
                </div>
              </section>
            )}
          </div>
        )}

        {!open && (
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Ver boletim completo</Button>
        )}
      </CardContent>
    </Card>
  );
}

function MediaThumb({ path, type }: { path: string; type: string }) {
  const { data: url } = useQuery({
    queryKey: ["tutor-report-media-url", path],
    queryFn: async () => (await supabase.storage.from("reports").createSignedUrl(path, 3600)).data?.signedUrl ?? null,
  });
  if (!url) return <div className="aspect-square rounded-lg bg-muted" />;
  if (type === "video") return <video src={url} controls className="aspect-square w-full rounded-lg object-cover" />;
  return <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />;
}
