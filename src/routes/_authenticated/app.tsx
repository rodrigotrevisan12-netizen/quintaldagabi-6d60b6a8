import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async () => {
    // Defesa em profundidade: o painel interno é exclusivo da equipe (admin/funcionario).
    // RLS já bloqueia leitura/escrita para tutores, mas evitamos renderizar a UI da equipe.
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw redirect({ to: "/auth" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const allowed = (roles ?? []).some(
      (r) => r.role === "admin" || r.role === "funcionario",
    );
    if (!allowed) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
