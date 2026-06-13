import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Quintal da Gabi" }] }),
  component: () => <ComingSoon title="Financeiro" description="Lançamentos por agendamento, formas de pagamento e contas a receber. Em breve." />,
});
