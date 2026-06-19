import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tutor/financeiro")({
  head: () => ({ meta: [{ title: "Recibos — Quintal da Gabi" }] }),
  component: TutorFin,
});

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function TutorFin() {
  const { data: me } = useCurrentUser();

  const { data: tx } = useQuery({
    queryKey: ["tutor-tx", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data: t } = await supabase.from("tutors").select("id").eq("user_id", me!.userId).maybeSingle();
      if (!t) return [];
      const { data } = await supabase.from("financial_transactions")
        .select("*").eq("tutor_id", t.id).order("transaction_date", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">Recibos & Pagamentos</h1>
      {!tx?.length ? <p className="text-sm text-muted-foreground">Nenhum lançamento.</p> :
        tx.map((t: any) => (
          <Card key={t.id}><CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{t.description ?? t.category}</p>
                <p className="text-xs text-muted-foreground">{new Date(t.transaction_date).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{fmt(Number(t.amount ?? 0))}</p>
              <Badge variant={t.status === "pago" ? "default" : "outline"}>{t.status}</Badge>
            </div>
          </CardContent></Card>
        ))}
    </div>
  );
}
