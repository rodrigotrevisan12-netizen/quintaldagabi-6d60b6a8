import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Se o usuário foi convidado pela admin e ainda não definiu a senha,
    // força a tela de definir senha antes de qualquer outra coisa.
    const { data: prof } = await supabase
      .from("profiles")
      .select("must_set_password")
      .eq("id", data.user.id)
      .maybeSingle();
    if (prof?.must_set_password) {
      throw redirect({ to: "/reset-password" });
    }

    // Gate de assinatura: /app/assinatura é sempre acessível para admins
    // regularizarem pagamento. Demais rotas exigem acesso vigente.
    const path = location.pathname;
    const isBillingPage = path.startsWith("/app/assinatura");
    if (!isBillingPage) {
      const { data: canUse } = await supabase.rpc("current_user_has_access");
      if (canUse === false) {
        throw redirect({ to: "/app/assinatura" });
      }
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
