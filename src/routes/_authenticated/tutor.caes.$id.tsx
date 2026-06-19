import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Syringe, BedDouble, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/tutor/caes/$id")({
  head: () => ({ meta: [{ title: "Cão — Quintal da Gabi" }] }),
  component: DogDetail,
});

function DogDetail() {
  const { id } = Route.useParams();

  const { data: dog } = useQuery({
    queryKey: ["tutor-dog", id],
    queryFn: async () => {
      const { data } = await supabase.from("dogs").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: vaccines } = useQuery({
    queryKey: ["tutor-vaccines", id],
    queryFn: async () => (await supabase.from("dog_vaccines").select("*").eq("dog_id", id).order("applied_at", { ascending: false })).data ?? [],
  });

  const { data: stays } = useQuery({
    queryKey: ["tutor-stays", id],
    queryFn: async () => (await supabase.from("boarding_stays").select("*").eq("dog_id", id).order("check_in", { ascending: false })).data ?? [],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link to="/tutor/caes" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          {dog?.photo_url ? <img src={dog.photo_url} className="h-20 w-20 rounded-full object-cover" /> :
            <span className="h-20 w-20 rounded-full bg-muted" />}
          <div>
            <h1 className="font-display text-2xl font-semibold">{dog?.name}</h1>
            <p className="text-sm text-muted-foreground">{dog?.breed ?? "—"} · {dog?.size ?? ""}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="vaccines">
        <TabsList>
          <TabsTrigger value="vaccines"><Syringe className="mr-2 h-4 w-4" />Vacinas</TabsTrigger>
          <TabsTrigger value="stays"><BedDouble className="mr-2 h-4 w-4" />Hospedagens</TabsTrigger>
          <TabsTrigger value="timeline"><Stethoscope className="mr-2 h-4 w-4" />Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="vaccines" className="space-y-2">
          {vaccines?.length ? vaccines.map((v: any) => (
            <Card key={v.id}><CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{v.vaccine_name}</p>
                <p className="text-xs text-muted-foreground">Aplicada: {v.applied_at ? new Date(v.applied_at).toLocaleDateString("pt-BR") : "—"}</p>
              </div>
              {v.next_dose_at ? <Badge variant="outline">Próxima: {new Date(v.next_dose_at).toLocaleDateString("pt-BR")}</Badge> : null}
            </CardContent></Card>
          )) : <p className="text-sm text-muted-foreground">Nenhuma vacina registrada.</p>}
        </TabsContent>

        <TabsContent value="stays" className="space-y-2">
          {stays?.length ? stays.map((s: any) => (
            <Card key={s.id}><CardContent className="p-4">
              <p className="font-medium">{new Date(s.check_in).toLocaleDateString("pt-BR")} → {s.check_out ? new Date(s.check_out).toLocaleDateString("pt-BR") : "em andamento"}</p>
              <p className="text-xs text-muted-foreground">{s.status}</p>
            </CardContent></Card>
          )) : <p className="text-sm text-muted-foreground">Sem hospedagens.</p>}
        </TabsContent>

        <TabsContent value="timeline">
          <Card><CardContent className="p-4 text-sm">
            <Link to="/app/caes/$id/timeline" params={{ id }} className="text-primary underline">Abrir timeline completa</Link>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
