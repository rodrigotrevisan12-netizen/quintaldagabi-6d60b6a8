import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { PawPrint, Home, Dog, FileText, Newspaper, Receipt, LogOut, Send, Scissors, Camera } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tutor")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userData.user.id);
    const list = (roles ?? []).map((r) => r.role);
    // Equipe usa /app, tutor (e quem não tem role) usa /tutor
    if (list.includes("admin") || list.includes("funcionario")) {
      // Não força a equipe pra fora; permite visualizar
    }
  },
  component: TutorShellRoute,
});

const ITEMS = [
  { to: "/tutor", label: "Início", icon: Home, exact: true },
  { to: "/tutor/stories", label: "Stories", icon: Camera },
  { to: "/tutor/caes", label: "Meus cães", icon: Dog },
  { to: "/tutor/banho-tosa", label: "Banho & Tosa", icon: Scissors },
  { to: "/tutor/boletins", label: "Boletins", icon: Newspaper },
  { to: "/tutor/documentos", label: "Contratos", icon: FileText },
  { to: "/tutor/financeiro", label: "Recibos", icon: Receipt },
  { to: "/tutor/chegada", label: "Estou chegando", icon: Send },
];

function TutorShellRoute() {
  return <TutorShell><Outlet /></TutorShell>;
}

function TutorShell({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <PawPrint className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-sidebar-foreground">Quintal da Gabi</p>
            <p className="text-xs text-sidebar-foreground/70">Área do tutor</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 pb-4">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="mb-3 truncate text-sm text-sidebar-foreground">
            {isLoading ? "…" : (me?.fullName ?? me?.email)}
          </p>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
          <Link to="/tutor" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <PawPrint className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-semibold">Tutor</span>
          </Link>
          <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">{children}</main>
        <nav className="sticky bottom-0 grid grid-cols-5 border-t bg-card lg:hidden">
          {ITEMS.slice(0, 5).map((it) => {
            const Icon = it.icon;
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} className={cn("flex flex-col items-center gap-1 py-2 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
