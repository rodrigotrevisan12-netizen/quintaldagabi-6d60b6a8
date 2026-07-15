import { createFileRoute, redirect } from "@tanstack/react-router";

// Página unificada em /app/funcionarios ("Equipe"). Mantido aqui só
// para não quebrar links/favoritos antigos.
export const Route = createFileRoute("/_authenticated/app/tarefas")({
  beforeLoad: () => {
    throw redirect({ to: "/app/funcionarios" });
  },
});
