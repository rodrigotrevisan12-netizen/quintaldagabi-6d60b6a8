import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/app/ocorrencias")({
  head: () => ({ meta: [{ title: "Ocorrências — Quintal da Gabi" }] }),
  component: () => <ComingSoon title="Ocorrências" description="Registro de eventos do dia (briga, mal-estar, fuga, observações). Em breve." />,
});
