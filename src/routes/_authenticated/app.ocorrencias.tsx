import { createFileRoute, redirect } from "@tanstack/react-router";

// Página unificada em /app/comunicacao (aba "Ocorrências"). Mantido aqui
// só para não quebrar links/favoritos antigos.
export const Route = createFileRoute("/_authenticated/app/ocorrencias")({
  beforeLoad: () => {
    throw redirect({ to: "/app/comunicacao" });
  },
});
