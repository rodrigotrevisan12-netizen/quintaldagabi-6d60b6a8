import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/app/saude")({
  head: () => ({ meta: [{ title: "Saúde — Quintal da Gabi" }] }),
  component: () => <ComingSoon title="Saúde" description="Vacinas, vermífugo, antipulgas, alergias, restrições alimentares, medicamentos e histórico médico. Em breve." />,
});
