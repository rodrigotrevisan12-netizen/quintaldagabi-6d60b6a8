import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
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

    return { user: data.user };
  },
  component: () => <Outlet />,
});
