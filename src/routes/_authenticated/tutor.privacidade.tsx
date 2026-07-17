import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

      const { data: tutor } = await supabase.from("tutors").select("*").eq("user_id", user.id).maybeSingle();

      let dogs: any[] = [];
      let boardingStays: any[] = [];
      let daycareStays: any[] = [];
      let groomingAppointments: any[] = [];
      let financial: any[] = [];
      const dogNameById = new Map<string, string>();

      if (tutor?.id) {
        const { data } = await supabase.from("dogs").select("*").eq("tutor_id", tutor.id);
        dogs = data ?? [];
        dogs.forEach((d) => dogNameById.set(d.id, d.name));
        const dogIds = dogs.map((d) => d.id);

        if (dogIds.length) {
          const [boardingRes, daycareRes, groomingRes] = await Promise.all([
            supabase.from("boarding_stays").select("*").in("dog_id", dogIds),
            supabase.from("daycare_stays").select("*").in("dog_id", dogIds),
            supabase.from("grooming_appointments").select("*").in("dog_id", dogIds),
          ]);
          boardingStays = boardingRes.data ?? [];
          daycareStays = daycareRes.data ?? [];
          groomingAppointments = groomingRes.data ?? [];
        }

        const { data: fin } = await (supabase as any)
          .from("financial_transactions")
          .select("*")
          .eq("tutor_id", tutor.id);
        financial = fin ?? [];
      }

      // ---- Monta um PDF legível, em português, sem IDs internos/técnicos ----
      const doc = new jsPDF();
      const fmtDate = (d: string | null) => (d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—");
      const fmtDateTime = (d: string | null) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—");
      const fmtBRL = (v: number | null) => (v != null ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—");
      let y = 16;

      doc.setFontSize(16);
      doc.text("Meus dados — Central Pet", 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, y);
      doc.setTextColor(0);
      y += 10;

      doc.setFontSize(12);
      doc.text("Meus dados de cadastro", 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        theme: "plain",
        styles: { fontSize: 9 },
        body: [
          ["Nome", tutor?.full_name ?? "—"],
          ["E-mail", user.email ?? "—"],
          ["Telefone / WhatsApp", tutor?.whatsapp ?? tutor?.phone ?? "—"],
          [
            "Endereço",
            tutor
              ? [tutor.address_street, tutor.address_number, tutor.address_neighborhood, tutor.address_city, tutor.address_state]
                  .filter(Boolean).join(", ") || "—"
              : "—",
          ],
          ["Cliente desde", fmtDate(user.created_at)],
        ],
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      if (dogs.length) {
        doc.setFontSize(12);
        doc.text("Meus cães", 14, y);
        y += 2;
        autoTable(doc, {
          startY: y + 4,
          head: [["Nome", "Raça", "Porte", "Peso (kg)", "Sexo", "Plano"]],
          body: dogs.map((d) => [d.name, d.breed ?? "—", d.size ?? "—", d.weight_kg ?? "—", d.sex ?? "—", d.plan ?? "—"]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 127, 80] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      if (daycareStays.length) {
        if (y > 250) { doc.addPage(); y = 16; }
        doc.setFontSize(12);
        doc.text("Histórico na creche", 14, y);
        autoTable(doc, {
          startY: y + 4,
          head: [["Cão", "Chegada", "Saída"]],
          body: daycareStays.map((s) => [dogNameById.get(s.dog_id) ?? "—", fmtDateTime(s.check_in_at), fmtDateTime(s.check_out_at)]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 127, 80] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      if (boardingStays.length) {
        if (y > 250) { doc.addPage(); y = 16; }
        doc.setFontSize(12);
        doc.text("Histórico de hospedagens", 14, y);
        autoTable(doc, {
          startY: y + 4,
          head: [["Cão", "Entrada", "Saída"]],
          body: boardingStays.map((s) => [dogNameById.get(s.dog_id) ?? "—", fmtDateTime(s.check_in_at), fmtDateTime(s.check_out_at)]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 127, 80] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      if (groomingAppointments.length) {
        if (y > 250) { doc.addPage(); y = 16; }
        doc.setFontSize(12);
        doc.text("Histórico de banho & tosa", 14, y);
        autoTable(doc, {
          startY: y + 4,
          head: [["Cão", "Data"]],
          body: groomingAppointments.map((g) => [dogNameById.get(g.dog_id) ?? "—", fmtDateTime(g.scheduled_at)]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 127, 80] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      if (financial.length) {
        if (y > 240) { doc.addPage(); y = 16; }
        doc.setFontSize(12);
        doc.text("Meu histórico financeiro", 14, y);
        autoTable(doc, {
          startY: y + 4,
          head: [["Descrição", "Valor", "Situação", "Vencimento"]],
          body: financial.map((f) => [f.description ?? "—", fmtBRL(f.amount), f.status ?? "—", fmtDate(f.due_date)]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 127, 80] },
        });
      }

      doc.save(`meus-dados-central-pet-${format(new Date(), "yyyyMMdd")}.pdf`);
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
