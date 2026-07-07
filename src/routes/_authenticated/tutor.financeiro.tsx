import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Receipt, AlertCircle, FileText } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/tutor/financeiro")({
  head: () => ({ meta: [{ title: "Recibos — Quintal da Gabi" }] }),
  component: TutorFin,
});

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const isOpen = (s?: string | null) => s === "pendente" || s === "atrasado";
const isPaid = (s?: string | null) => s === "pago" || s === "recebido";

function TutorFin() {
  const { data: me } = useCurrentUser();

  const { data: tx } = useQuery({
    queryKey: ["tutor-tx", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data: t } = await supabase
        .from("tutors").select("id").eq("user_id", me!.userId).maybeSingle();
      if (!t) return [];
      const { data } = await supabase.from("financial_transactions")
        .select("*").eq("tutor_id", t.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const txIds = useMemo(() => (tx ?? []).map((t: any) => t.id), [tx]);

  const { data: receipts } = useQuery({
    queryKey: ["tutor-receipts", txIds],
    enabled: txIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("receipts")
        .select("*").in("transaction_id", txIds);
      return data ?? [];
    },
  });

  const receiptByTx = useMemo(() => {
    const m: Record<string, any> = {};
    (receipts ?? []).forEach((r: any) => { m[r.transaction_id] = r; });
    return m;
  }, [receipts]);

  const open = (tx ?? []).filter((t: any) => isOpen(t.status));
  const paid = (tx ?? []).filter((t: any) => isPaid(t.status));
  const openTotal = open.reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Recibos & Pagamentos</h1>

      {open.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-amber-700" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Você tem {open.length} valor(es) em aberto</p>
              <p className="text-xs text-amber-800">Total: {fmt(openTotal)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Em aberto</h2>
        {!open.length ? <p className="text-sm text-muted-foreground">Nenhum valor em aberto.</p> :
          open.map((t: any) => (
            <Card key={t.id}><CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium">{t.description ?? t.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.due_date ? `Vence em ${new Date(t.due_date).toLocaleDateString("pt-BR")}` :
                      new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{fmt(Number(t.amount ?? 0))}</p>
                <Badge variant="outline" className="border-amber-400 text-amber-700">Em aberto</Badge>
              </div>
            </CardContent></Card>
          ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Pagos / Recibos</h2>
        {!paid.length ? <p className="text-sm text-muted-foreground">Nenhum recibo emitido ainda.</p> :
          paid.map((t: any) => {
            const r = receiptByTx[t.id];
            return (
              <Card key={t.id}><CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-medium">{t.description ?? t.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.paid_at ?? t.created_at).toLocaleDateString("pt-BR")}
                      {r ? ` · Recibo nº ${r.number}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">{fmt(Number(t.amount ?? 0))}</p>
                    <Badge>Pago</Badge>
                  </div>
                  {r?.pdf_url && (
                    <a href={r.pdf_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary underline">
                      <FileText className="h-3 w-3" /> recibo
                    </a>
                  )}
                </div>
              </CardContent></Card>
            );
          })}
      </section>
    </div>
  );
}
