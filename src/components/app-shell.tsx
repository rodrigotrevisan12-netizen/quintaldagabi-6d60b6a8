import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  PawPrint,
  CalendarDays,
  Users,
  Dog,
  Settings,
  LogOut,
  Home,
  HeartPulse,
  BedDouble,
  Bath,
  AlertCircle,
  ListChecks,
  Wallet,
  BarChart3,
  FileText,
  ClipboardList,
  Newspaper,
} from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
  soon?: boolean;
};

const NAV: NavItem[] = [
  { to: "/app", label: "Início", icon: Home, roles: ["admin", "funcionario", "tutor"] },
  { to: "/app/agenda", label: "Creche", icon: CalendarDays, roles: ["admin", "funcionario"] },
  { to: "/app/programacao", label: "Programação do dia", icon: ClipboardList, roles: ["admin", "funcionario"] },
  { to: "/app/tutores", label: "Tutores", icon: Users, roles: ["admin", "funcionario"] },
  { to: "/app/caes", label: "Cães", icon: Dog, roles: ["admin", "funcionario", "tutor"] },
  { to: "/app/saude", label: "Saúde", icon: HeartPulse, roles: ["admin", "funcionario"], soon: true },
  { to: "/app/hospedagem", label: "Hospedagem", icon: BedDouble, roles: ["admin", "funcionario"] },
  { to: "/app/banho-tosa", label: "Banho & tosa", icon: Bath, roles: ["admin", "funcionario"] },
  { to: "/app/boletins", label: "Boletins", icon: Newspaper, roles: ["admin", "funcionario"] },
  { to: "/app/documentos", label: "Documentos", icon: FileText, roles: ["admin", "funcionario"] },
  { to: "/app/ocorrencias", label: "Ocorrências", icon: AlertCircle, roles: ["admin", "funcionario"], soon: true },
  { to: "/app/tarefas", label: "Tarefas", icon: ListChecks, roles: ["admin", "funcionario"], soon: true },
  { to: "/app/financeiro", label: "Financeiro", icon: Wallet, roles: ["admin"] },
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin"], soon: true },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const role = me?.primaryRole ?? "tutor";
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <PawPrint className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base font-semibold leading-none text-sidebar-foreground">
              Quintal da Gabi
            </p>
            <p className="text-xs text-sidebar-foreground/70">
              {role === "admin" ? "Administradora" : role === "funcionario" ? "Funcionário" : "Tutor"}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {items.map((item) => {
            const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.soon ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    em breve
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 px-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {isLoading ? "…" : (me?.fullName ?? me?.email ?? "Usuário")}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">{me?.email}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
          <Link to="/app" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <PawPrint className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-semibold">Quintal da Gabi</span>
          </Link>
          <Button size="sm" variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>

        <nav className="sticky bottom-0 grid grid-cols-4 border-t border-border bg-card lg:hidden">
          {items.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
