import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/app/caes")({
  head: () => ({ meta: [{ title: "Cães — Quintal da Gabi" }] }),
  component: () => (
    <ComingSoon
      title="Cães"
      description="Prontuário do cão: foto, raça, porte, vacinas, alergias, observações de comportamento e histórico de estadias."
    />
  ),
});
