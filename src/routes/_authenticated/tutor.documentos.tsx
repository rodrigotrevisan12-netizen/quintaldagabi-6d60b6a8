import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tutor/documentos")({
  head: () => ({ meta: [{ title: "Contratos — Quintal da Gabi" }] }),
  component: Docs,
});

function Docs() {
  const { data: me } = useCurrentUser();

  const { data: docs } = useQuery({
    queryKey: ["tutor-docs", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data: t } = await supabase.from("tutors").select("id").eq("user_id", me!.userId).maybeSingle();
      if (!t) return [];
      const { data } = await supabase.from("documents")
        .select("id, document_type, status, created_at")
        .eq("tutor_id", t.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">Contratos & Termos</h1>
      {!docs?.length ? <p className="text-sm text-muted-foreground">Nenhum documento.</p> :
        docs.map((d: any) => (
          <Card key={d.id}><CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium capitalize">{String(d.document_type).replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
            <Badge variant={d.status === "signed" ? "default" : "outline"}>{d.status}</Badge>
          </CardContent></Card>
        ))}
    </div>
  );
}
