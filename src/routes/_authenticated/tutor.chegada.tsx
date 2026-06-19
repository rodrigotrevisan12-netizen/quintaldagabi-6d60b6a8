import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Check, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/tutor/chegada")({
  head: () => ({ meta: [{ title: "Estou chegando — Quintal da Gabi" }] }),
  component: Chegada,
});

function Chegada() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [eta, setEta] = useState(15);
  const [purpose, setPurpose] = useState("pickup");
  const [msg, setMsg] = useState("");

  const { data: tutor } = useQuery({
    queryKey: ["my-tutor", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => (await supabase.from("tutors").select("id").eq("user_id", me!.userId).maybeSingle()).data,
  });

  const { data: active, refetch } = useQuery({
    queryKey: ["arrivals-active", tutor?.id],
    enabled: !!tutor?.id,
    queryFn: async () => (await supabase.from("arrival_notifications")
      .select("*").eq("tutor_id", tutor!.id).eq("status","on_the_way")
      .order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!tutor) throw new Error("Tutor não encontrado");
      const { error } = await supabase.from("arrival_notifications").insert({
        tutor_id: tutor.id, purpose, eta_minutes: eta, message: msg || null, created_by: me!.userId,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("A equipe foi avisada!"); qc.invalidateQueries({ queryKey: ["arrivals-active"] }); setMsg(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const finish = useMutation({
    mutationFn: async (status: "arrived" | "cancelled") => {
      if (!active) return;
      const patch: any = { status };
      if (status === "arrived") patch.arrived_at = new Date().toISOString();
      else patch.cancelled_at = new Date().toISOString();
      const { error } = await supabase.from("arrival_notifications").update(patch).eq("id", active.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); refetch(); },
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">Estou chegando</h1>

      {active ? (
        <Card className="border-primary">
          <CardHeader><CardTitle>Você avisou que está a caminho</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p>Chegada estimada em <Badge>{active.eta_minutes} min</Badge></p>
            {active.message && <p className="text-sm text-muted-foreground">"{active.message}"</p>}
            <div className="flex gap-2">
              <Button onClick={() => finish.mutate("arrived")} className="flex-1"><Check className="mr-2 h-4 w-4" />Cheguei</Button>
              <Button variant="outline" onClick={() => finish.mutate("cancelled")}><X className="mr-2 h-4 w-4" />Cancelar</Button>
            </div>
            <p className="text-xs text-muted-foreground">O aviso é encerrado automaticamente quando você confirma a chegada.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Avisar a equipe</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Vou buscar meu cão</SelectItem>
                  <SelectItem value="dropoff">Vou levar meu cão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tempo estimado (minutos)</Label>
              <Input type="number" min={1} max={180} value={eta} onChange={(e) => setEta(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Mensagem (opcional)</Label>
              <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex: trânsito leve, chegando logo" />
            </div>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !tutor} className="w-full">
              <Send className="mr-2 h-4 w-4" /> Avisar equipe
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
