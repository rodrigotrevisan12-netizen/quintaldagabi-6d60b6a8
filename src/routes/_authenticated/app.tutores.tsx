import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/app/tutores")({
  head: () => ({ meta: [{ title: "Tutores — Quintal da Gabi" }] }),
  component: () => (
    <ComingSoon
      title="Tutores"
      description="Cadastro completo do tutor: dados pessoais, contato, endereço e consentimento LGPD. O e-mail dispara o convite para criar a senha."
    />
  ),
});
