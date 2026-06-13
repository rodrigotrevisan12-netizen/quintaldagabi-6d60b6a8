import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Quintal da Gabi" }] }),
  component: () => (
    <ComingSoon
      title="Configurações"
      description="Unidades, serviços e preços, permissões dos funcionários e dados da empresa."
    />
  ),
});
