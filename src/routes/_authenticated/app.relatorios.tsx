import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Quintal da Gabi" }] }),
  component: () => <ComingSoon title="Relatórios" description="Faturamento, ocupação, serviços mais vendidos e desempenho por unidade. Em breve." />,
});
