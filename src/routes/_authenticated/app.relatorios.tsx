import { createFileRoute, redirect } from "@tanstack/react-router";

// Página unificada em /app/financeiro (aba "Relatórios"). Mantido aqui só
// para não quebrar links/favoritos antigos.
export const Route = createFileRoute("/_authenticated/app/relatorios")({
  beforeLoad: () => {
    throw redirect({ to: "/app/financeiro" });
  },
});
