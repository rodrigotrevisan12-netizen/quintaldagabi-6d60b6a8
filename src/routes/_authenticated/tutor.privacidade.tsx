import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/tutor/privacidade")({
  head: () => ({ meta: [{ title: "Meus dados — Central Pet" }] }),
  component: MeusDadosPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando análise",
  in_review: "Em análise",
  completed: "Concluída",
  rejected: "Recusada",
};

function MeusDadosPage() {
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const myRequests = useQuery({
    queryKey: ["my-data-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("data_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleExport() {
    setExporting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sessão expirada.");

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const { data: tutor } = await supabase.from("tutors").select("*").eq("user_id", user.id).maybeSingle();

      let dogs: any[] = [];
      let stories: any[] = [];
      let dailyReports: any[] = [];
      let boardingStays: any[] = [];
      let daycareStays: any[] = [];
      let groomingAppointments: any[] = [];
      let financial: any[] = [];

      if (tutor?.id) {
        const { data } = await supabase.from("dogs").select("*").eq("tutor_id", tutor.id);
        dogs = data ?? [];
        const dogIds = dogs.map((d) => d.id);

        if (dogIds.length) {
          const [storiesRes, boardingRes, daycareRes, groomingRes] = await Promise.all([
            supabase.from("dog_stories").select("*").in("dog_id", dogIds),
            supabase.from("boarding_stays").select("*").in("dog_id", dogIds),
            supabase.from("daycare_stays").select("*").in("dog_id", dogIds),
            supabase.from("grooming_appointments").select("*").in("dog_id", dogIds),
          ]);
          stories = storiesRes.data ?? [];
          boardingStays = boardingRes.data ?? [];
          daycareStays = daycareRes.data ?? [];
          groomingAppointments = groomingRes.data ?? [];
        }

        const { data: fin } = await (supabase as any)
          .from("financial_transactions")
          .select("*")
          .eq("tutor_id", tutor.id);
        financial = fin ?? [];

        const { data: reports } = await (supabase as any)
          .from("daily_reports")
          .select("*")
          .in("dog_id", dogIds.length ? dogIds : ["00000000-0000-0000-0000-000000000000"]);
        dailyReports = reports ?? [];
      }

      const exportPayload = {
        exported_at: new Date().toISOString(),
        conta: { email: user.email, criado_em: user.created_at },
        perfil: profile,
        tutor,
        caes: dogs,
        stories,
        boletins: dailyReports,
        hospedagens: boardingStays,
        creche: daycareStays,
        banho_tosa: groomingAppointments,
        financeiro: financial,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-central-pet-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Seus dados foram baixados.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao exportar seus dados.");
    } finally {
      setExporting(false);
    }
  }

  const requestDeletion = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sessão expirada.");
      const { error } = await (supabase as any).from("data_requests").insert({
        requester_user_id: user.id,
        requester_name: user.user_metadata?.full_name ?? null,
        requester_email: user.email,
        request_type: "delete",
        notes: deleteReason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido enviado. A equipe vai analisar em até 15 dias.");
      setDeleteOpen(false);
      setDeleteReason("");
      qc.invalidateQueries({ queryKey: ["my-data-requests"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao enviar o pedido."),
  });

  const hasPendingDeletion = (myRequests.data ?? []).some(
    (r: any) => r.request_type === "delete" && r.status !== "rejected",
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Meus dados</h1>
        <p className="text-sm text-muted-foreground">
          De acordo com a LGPD, você pode baixar uma cópia de tudo que temos sobre você e seus cães, ou
          solicitar a exclusão da sua conta a qualquer momento.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Baixar meus dados
          </CardTitle>
          <CardDescription>
            Gera um arquivo com seu perfil, cães, boletins, stories, hospedagens, creche, banho & tosa e
            histórico financeiro vinculado a você.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {exporting ? "Preparando arquivo…" : "Baixar meus dados"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir minha conta
          </CardTitle>
          <CardDescription>
            Sua solicitação será analisada pela equipe (em até 15 dias). Alguns dados podem precisar ser
            mantidos por obrigação legal (ex.: registros financeiros), mesmo após a exclusão da conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={hasPendingDeletion}>
            {hasPendingDeletion ? "Pedido já enviado" : "Solicitar exclusão da minha conta"}
          </Button>
        </CardContent>
      </Card>

      {(myRequests.data ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Minhas solicitações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(myRequests.data ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{r.request_type === "delete" ? "Exclusão de conta" : "Exportação de dados"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant={r.status === "completed" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Solicitar exclusão da conta?</AlertDialogTitle>
            <AlertDialogDescription>
              A equipe vai analisar seu pedido e entrar em contato. Isso não apaga nada imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo (opcional)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => requestDeletion.mutate()} disabled={requestDeletion.isPending}>
              Enviar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
