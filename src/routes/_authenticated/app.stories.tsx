import { createFileRoute, redirect } from "@tanstack/react-router";

// Página unificada em /app/boletins (aba "Stories"). Mantido aqui só
// para não quebrar links/favoritos antigos.
export const Route = createFileRoute("/_authenticated/app/stories")({
  beforeLoad: () => {
    throw redirect({ to: "/app/boletins" });
  },
});
