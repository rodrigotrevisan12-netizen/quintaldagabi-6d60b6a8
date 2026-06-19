import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/chegadas")({
  head: () => ({ meta: [{ title: "Chegadas — Quintal da Gabi" }] }),
  component: Chegadas,
});

function Chegadas() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["arrivals-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("arrival_notifications")
        .select("*, tutors:tutor_id(full_name, phone, whatsapp)")
        .order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
    refetchInterval: 15_000,
  });

  const close = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("arrival_notifications")
        .update({ status: "arrived", arrived_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marcada como chegou"); qc.invalidateQueries({ queryKey: ["arrivals-admin"] }); },
  });

  const active = data?.filter((a) => a.status === "on_the_way") ?? [];
  const history = data?.filter((a) => a.status !== "on_the_way") ?? [];

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-2xl font-semibold">Chegadas</h1>
        <p className="text-sm text-muted-foreground">Tutores que avisaram que estão a caminho.</p>
      </header>

      <section>
        <h2 className="mb-2 font-display text-lg">A caminho ({active.length})</h2>
        {!active.length ? <p className="text-sm text-muted-foreground">Ninguém a caminho agora.</p> :
          active.map((a: any) => (
            <Card key={a.id} className="mb-2"><CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{a.tutors?.full_name}</p>
                <p className="text-xs text-muted-foreground">{a.purpose === "pickup" ? "Buscando" : "Trazendo"} · ETA {a.eta_minutes} min</p>
                {a.message && <p className="mt-1 text-sm">"{a.message}"</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge>{a.eta_minutes} min</Badge>
                <Button size="sm" onClick={() => close.mutate(a.id)}><Check className="mr-1 h-3 w-3" />Chegou</Button>
              </div>
            </CardContent></Card>
          ))}
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg">Histórico</h2>
        {history.slice(0, 30).map((a: any) => (
          <Card key={a.id} className="mb-2"><CardContent className="flex items-center justify-between p-3">
            <div className="text-sm">
              <span className="font-medium">{a.tutors?.full_name}</span>
              <span className="ml-2 text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <Badge variant="outline">{a.status === "arrived" ? "Chegou" : "Cancelado"}</Badge>
          </CardContent></Card>
        ))}
      </section>
    </div>
  );
}
