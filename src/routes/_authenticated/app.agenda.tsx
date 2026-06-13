import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Quintal da Gabi" }] }),
  component: () => (
    <ComingSoon
      title="Agenda"
      description="Em breve: visão por dia, semana, marcação de creche, banho, tosa e hospedagem, check-in e check-out."
    />
  ),
});
