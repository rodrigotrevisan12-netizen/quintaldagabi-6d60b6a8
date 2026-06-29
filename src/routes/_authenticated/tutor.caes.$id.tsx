import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Syringe, BedDouble, Upload, Image as ImageIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/tutor/caes/$id")({
  head: () => ({ meta: [{ title: "Cão — Quintal da Gabi" }] }),
  component: DogDetail,
});

function DogDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: dog } = useQuery({
    queryKey: ["tutor-dog", id],
    queryFn: async () => (await supabase.from("dogs").select("*").eq("id", id).maybeSingle()).data,
  });

  const { data: vaccines } = useQuery({
    queryKey: ["tutor-vaccines", id],
    queryFn: async () =>
      (await supabase.from("dog_vaccines").select("*").eq("dog_id", id).order("applied_date", { ascending: false })).data ?? [],
  });

  const { data: stays } = useQuery({
    queryKey: ["tutor-stays", id],
    queryFn: async () =>
      (await supabase
        .from("boarding_stays")
        .select("*")
        .eq("dog_id", id)
        .order("check_in_at", { ascending: false })).data ?? [],
  });

  const today = new Date();
  const activeStay = (stays ?? []).find(
    (s: any) => !s.check_out_at || new Date(s.check_out_at) >= today,
  );

  const [vacName, setVacName] = useState("");
  const [vacDate, setVacDate] = useState("");
  const [vacFile, setVacFile] = useState<File | null>(null);

  const addVaccine = useMutation({
    mutationFn: async () => {
      if (!vacName || !vacDate) throw new Error("Informe a vacina e a data");
      let card_photo_url: string | null = null;
      if (vacFile) {
        const path = `${id}/vaccine-${Date.now()}-${vacFile.name}`;
        const up = await supabase.storage.from("dogs").upload(path, vacFile);
        if (up.error) throw up.error;
        const { data } = supabase.storage.from("dogs").getPublicUrl(path);
        card_photo_url = data.publicUrl;
      }
      const { error } = await supabase.from("dog_vaccines").insert({
        dog_id: id,
        vaccine_type: vacName,
        applied_date: vacDate,
        card_photo_url,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vacina adicionada");
      setVacName(""); setVacDate(""); setVacFile(null);
      qc.invalidateQueries({ queryKey: ["tutor-vaccines", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link to="/tutor/caes" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          {dog?.photo_url ? (
            <img src={dog.photo_url} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span className="h-20 w-20 rounded-full bg-muted" />
          )}
          <div className="flex-1">
            <h1 className="font-display text-2xl font-semibold">{dog?.name}</h1>
            <p className="text-sm text-muted-foreground">{dog?.breed ?? "—"} · {dog?.size ?? ""}</p>
          </div>
          {activeStay && <Badge>Em hospedagem</Badge>}
        </CardContent>
      </Card>

      <Tabs defaultValue="vaccines">
        <TabsList>
          <TabsTrigger value="vaccines"><Syringe className="mr-2 h-4 w-4" />Vacinas</TabsTrigger>
          <TabsTrigger value="stays"><BedDouble className="mr-2 h-4 w-4" />Hospedagens</TabsTrigger>
        </TabsList>

        <TabsContent value="vaccines" className="space-y-3">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Anexar carteira de vacinação</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div><Label>Vacina</Label><Input value={vacName} onChange={(e) => setVacName(e.target.value)} placeholder="Ex: V8" /></div>
                <div><Label>Data</Label><Input type="date" value={vacDate} onChange={(e) => setVacDate(e.target.value)} /></div>
                <div><Label>Foto da carteira</Label><Input type="file" accept="image/*" onChange={(e) => setVacFile(e.target.files?.[0] ?? null)} /></div>
              </div>
              <Button size="sm" onClick={() => addVaccine.mutate()} disabled={addVaccine.isPending}>
                <Upload className="mr-1 h-4 w-4" /> Enviar
              </Button>
            </CardContent>
          </Card>

          {vaccines?.length ? vaccines.map((v: any) => (
            <Card key={v.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex-1">
                  <p className="font-medium">{v.vaccine_type}</p>
                  <p className="text-xs text-muted-foreground">
                    Aplicada: {v.applied_date ? new Date(v.applied_date).toLocaleDateString("pt-BR") : "—"}
                  </p>
                  {v.card_photo_url && (
                    <a href={v.card_photo_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline">
                      <ImageIcon className="h-3 w-3" /> ver carteira
                    </a>
                  )}
                </div>
                {v.next_due_date ? <Badge variant="outline">Próxima: {new Date(v.next_due_date).toLocaleDateString("pt-BR")}</Badge> : null}
              </CardContent>
            </Card>
          )) : <p className="text-sm text-muted-foreground">Nenhuma vacina registrada.</p>}
        </TabsContent>

        <TabsContent value="stays" className="space-y-2">
          {stays?.length ? stays.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <p className="font-medium">
                  {new Date(s.check_in_at).toLocaleDateString("pt-BR")} → {s.check_out_at ? new Date(s.check_out_at).toLocaleDateString("pt-BR") : "em andamento"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.check_out_at ? "finalizada" : "ativa"}
                </p>
              </CardContent>
            </Card>
          )) : <p className="text-sm text-muted-foreground">Sem hospedagens.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
