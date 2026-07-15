import { createFileRoute, redirect } from "@tanstack/react-router";

// Página unificada em /app/agenda (aba "Chegadas"). Mantido aqui só
// para não quebrar links/favoritos antigos.
export const Route = createFileRoute("/_authenticated/app/chegadas")({
  beforeLoad: () => {
    throw redirect({ to: "/app/agenda" });
  },
});
