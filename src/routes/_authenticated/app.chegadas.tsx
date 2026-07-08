import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/app/chegadas")({
  head: () => ({ meta: [{ title: "Chegadas — Quintal da Gabi" }] }),
  component: Chegadas,
});

function remaining(createdAt: string, eta: number) {
  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  return eta - elapsed;
}

function Chegadas() {
  const qc = useQueryClient();
  const [, setTick] = useState(0);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const { data: me } = useCurrentUser();
  const isAdmin = me?.primaryRole === "admin";

  // Tick a cada 30s para contagem regressiva
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("arrivals-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "arrival_notifications" },
        () => qc.invalidateQueries({ queryKey: ["arrivals-admin"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data } = useQuery({
    queryKey: ["arrivals-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("arrival_notifications")
        .select("*, tutors:tutor_id(full_name, phone, whatsapp)")
        .order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const close = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("arrival_notifications")
        .update({ status: "arrived", arrived_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marcada como chegou"); qc.invalidateQueries({ queryKey: ["arrivals-admin"] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("arrival_notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["arrivals-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const active = data?.filter((a) => a.status === "on_the_way") ?? [];
  const history = data?.filter((a) => a.status !== "on_the_way") ?? [];

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-2xl font-semibold">Chegadas</h1>
        <p className="text-sm text-muted-foreground">Atualizada em tempo real. Contagem regressiva por tutor.</p>
      </header>

      <section>
        <h2 className="mb-2 font-display text-lg">A caminho ({active.length})</h2>
        {!active.length ? <p className="text-sm text-muted-foreground">Ninguém a caminho agora.</p> :
          active.map((a: any) => {
            const left = remaining(a.created_at, a.eta_minutes);
            const tone = left <= 0 ? "destructive" : left <= 3 ? "default" : "secondary";
            const label = left <= 0 ? "Chegando agora" : `${left} min`;
            return (
              <Card key={a.id} className="mb-2"><CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{a.tutors?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{a.purpose === "pickup" ? "Buscando" : "Trazendo"} · avisou às {new Date(a.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  {a.message && <p className="mt-1 text-sm">"{a.message}"</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tone as any}>{label}</Badge>
                  <Button size="sm" onClick={() => close.mutate(a.id)}><Check className="mr-1 h-3 w-3" />Chegou</Button>
                  {isAdmin && (
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(a)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent></Card>
            );
          })}
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg">Histórico</h2>
        {history.slice(0, 30).map((a: any) => (
          <Card key={a.id} className="mb-2"><CardContent className="flex items-center justify-between p-3">
            <div className="text-sm">
              <span className="font-medium">{a.tutors?.full_name}</span>
              <span className="ml-2 text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{a.status === "arrived" ? "Chegou" : "Cancelado"}</Badge>
              {isAdmin && (
                <Button size="icon" variant="ghost" onClick={() => setToDelete(a)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent></Card>
        ))}
      </section>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este registro de chegada?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.tutors?.full_name ? `Tutor: ${toDelete.tutors.full_name}. ` : ""}
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
