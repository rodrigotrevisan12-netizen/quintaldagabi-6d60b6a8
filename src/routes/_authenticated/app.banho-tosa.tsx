import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/app/banho-tosa")({
  head: () => ({ meta: [{ title: "Banho & tosa — Quintal da Gabi" }] }),
  component: () => <ComingSoon title="Banho & tosa" description="Agendamento, fila do dia, serviços extras e finalização. Em breve." />,
});
