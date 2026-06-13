import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/app/hospedagem")({
  head: () => ({ meta: [{ title: "Hospedagem — Quintal da Gabi" }] }),
  component: () => <ComingSoon title="Hospedagem" description="Reservas, check-in/check-out, ocupação e relatório por estadia. Em breve." />,
});
