import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/app/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Quintal da Gabi" }] }),
  component: () => <ComingSoon title="Tarefas" description="Lista de tarefas operacionais com responsável, prazo e status. Em breve." />,
});
