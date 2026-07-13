import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getMySubscription, openBillingPortal } from "@/lib/payments.functions";
import { usePaddleCheckout } from "@/hooks/use-paddle-checkout";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/assinatura")({
  component: SubscriptionPage,
});

type Plan = {
  priceId: string;
  label: string;
  price: string;
  perMonth: string;
  cadence: string;
  badge?: string;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    priceId: "central_pet_monthly",
    label: "Mensal",
    price: "R$ 220",
    perMonth: "R$ 220/mês",
    cadence: "cobrado todo mês",
  },
  {
    priceId: "central_pet_quarterly",
    label: "Trimestral",
    price: "R$ 620",
    perMonth: "R$ 206,67/mês",
    cadence: "cobrado a cada 3 meses",
    badge: "Economize 6%",
  },
  {
    priceId: "central_pet_semiannual",
    label: "Semestral",
    price: "R$ 1.200",
    perMonth: "R$ 200/mês",
    cadence: "cobrado a cada 6 meses",
    badge: "Economize 9%",
  },
  {
    priceId: "central_pet_yearly",
    label: "Anual",
    price: "R$ 2.200",
    perMonth: "R$ 183,33/mês",
    cadence: "cobrado 1x por ano",
    highlight: true,
    badge: "Mais popular · Economize 17%",
  },
];

function SubscriptionPage() {
  const qc = useQueryClient();
  const fetchSub = useServerFn(getMySubscription);
  const openPortal = useServerFn(openBillingPortal);
  const { data: user } = useCurrentUser();
  const { openCheckout, loading: paying } = usePaddleCheckout();
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: sub, isLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => fetchSub(),
    refetchInterval: 5_000, // atualiza pós-checkout
  });

  const isAdmin = user?.roles.includes("admin") ?? false;

  // Detecta retorno do checkout
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") === "success") {
      toast.success("Pagamento recebido! Estamos ativando sua assinatura…");
      url.searchParams.delete("checkout");
      window.history.replaceState(null, "", url.toString());
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    }
  }, [qc]);

  async function handleSubscribe(plan: Plan) {
    if (!user || !sub?.id) return;
    if (!isAdmin) {
      toast.error("Apenas o administrador da empresa pode assinar.");
      return;
    }
    try {
      await openCheckout({
        priceId: plan.priceId,
        customerEmail: user.email ?? undefined,
        customData: { userId: user.userId, companyId: sub.id },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir o checkout");
    }
  }

  async function handleManage() {
    setPortalLoading(true);
    try {
      const { url } = await openPortal();
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o portal");
    } finally {
      setPortalLoading(false);
    }
  }

  const status = sub?.subscription_status;
  const hasActive = sub?.hasAccess;
  const activePriceId = sub?.billing_price_id;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <PaymentTestModeBanner />

      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">Assinatura</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o plano da sua empresa. Todos os dados são preservados mesmo se a assinatura
          expirar.
        </p>
      </header>

      {/* Status atual */}
      <Card className="p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <StatusBadge status={status ?? "unknown"} />
                {sub?.cancel_at_period_end && (
                  <Badge variant="outline">Cancelamento agendado</Badge>
                )}
              </div>
              {status === "trialing" && sub?.trialDaysLeft !== null && (
                <p className="text-sm">
                  Você está em período de avaliação — restam{" "}
                  <strong>{sub?.trialDaysLeft} dia(s)</strong>. Assine antes do fim para não perder
                  acesso.
                </p>
              )}
              {status === "past_due" && (
                <p className="text-sm text-orange-700">
                  O último pagamento falhou. Atualize o método de pagamento no portal para não
                  perder acesso.
                </p>
              )}
              {status === "canceled" && sub?.current_period_end && (
                <p className="text-sm">
                  Sua assinatura foi cancelada. Você mantém acesso até{" "}
                  <strong>{new Date(sub.current_period_end).toLocaleDateString("pt-BR")}</strong>.
                </p>
              )}
              {!hasActive && status !== "trialing" && (
                <p className="text-sm text-red-700">
                  Sistema suspenso. Seus dados estão preservados — escolha um plano abaixo para
                  reativar.
                </p>
              )}
              {activePriceId && (
                <p className="text-xs text-muted-foreground">
                  Plano atual: <code className="font-mono">{activePriceId}</code>
                </p>
              )}
            </div>
            {sub?.billing_customer_id && isAdmin && (
              <Button variant="outline" onClick={handleManage} disabled={portalLoading}>
                {portalLoading ? "Abrindo…" : "Gerenciar pagamento"}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Planos */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = activePriceId === plan.priceId && hasActive;
          return (
            <Card
              key={plan.priceId}
              className={cn(
                "flex flex-col gap-4 p-6",
                plan.highlight && "border-primary shadow-md",
                isCurrent && "ring-2 ring-primary",
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl">{plan.label}</h3>
                  {plan.badge && (
                    <Badge className="bg-orange-100 text-orange-900" variant="outline">
                      {plan.badge}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-3xl font-bold">{plan.price}</p>
                <p className="text-sm text-muted-foreground">{plan.perMonth}</p>
                <p className="text-xs text-muted-foreground">{plan.cadence}</p>
              </div>
              <Button
                className="mt-auto"
                onClick={() => handleSubscribe(plan)}
                disabled={paying || !isAdmin || isCurrent}
                variant={plan.highlight ? "default" : "outline"}
              >
                {isCurrent ? "Plano atual" : paying ? "Abrindo…" : "Assinar"}
              </Button>
            </Card>
          );
        })}
      </section>

      {!isAdmin && (
        <p className="text-center text-sm text-muted-foreground">
          Apenas o administrador da empresa pode contratar ou alterar o plano. Avise seu admin.
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Pagamento por cartão de crédito. Métodos locais (como PIX) aparecem no checkout quando
        disponíveis para sua conta e região.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    trialing: { label: "Em avaliação", className: "bg-blue-100 text-blue-900" },
    active: { label: "Ativa", className: "bg-green-100 text-green-900" },
    past_due: { label: "Pagamento pendente", className: "bg-orange-100 text-orange-900" },
    canceled: { label: "Cancelada", className: "bg-red-100 text-red-900" },
    unknown: { label: "Desconhecido", className: "bg-muted text-muted-foreground" },
  };
  const info = map[status] ?? map.unknown;
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
}
