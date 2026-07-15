import { createFileRoute, redirect } from "@tanstack/react-router";

// Página unificada em /app/financeiro. Mantido aqui só para não quebrar
// links/favoritos antigos.
export const Route = createFileRoute("/_authenticated/app/inteligencia-financeira")({
  beforeLoad: () => {
    throw redirect({ to: "/app/financeiro" });
  },
});
