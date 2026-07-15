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
  FileText,
  ClipboardList,
  Newspaper,
  UserCog,
  GraduationCap,
  MessageSquare,
  Send,
  Camera,
  CalendarRange,
  ChevronDown,
  Folder,
  CreditCard,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import { useBrand } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
  soon?: boolean;
};

type NavGroup = {
  id: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

// Itens organizados em grupos que fazem sentido operacional, para reduzir a
// quantidade de opções soltas na barra lateral. Grupos sem "label" são
// exibidos como um item único (ex.: Início, Documentos, Configurações).
const NAV_GROUPS: NavGroup[] = [
  {
    id: "inicio",
    items: [{ to: "/app", label: "Início", icon: Home, roles: ["admin", "funcionario", "tutor"] }],
  },
  {
    id: "operacao",
    label: "Operação do dia",
    icon: ClipboardList,
    items: [
      {
        to: "/app/calendario",
        label: "Calendário",
        icon: CalendarRange,
        roles: ["admin", "funcionario"],
      },
      { to: "/app/agenda", label: "Creche", icon: CalendarDays, roles: ["admin", "funcionario"] },
      {
        to: "/app/programacao",
        label: "Programação do dia",
        icon: ListChecks,
        roles: ["admin", "funcionario"],
      },
      { to: "/app/chegadas", label: "Chegadas", icon: Send, roles: ["admin", "funcionario"] },
    ],
  },
  {
    id: "estadias",
    label: "Hospedagem & Banho",
    icon: BedDouble,
    items: [
      {
        to: "/app/hospedagem",
        label: "Hospedagem",
        icon: BedDouble,
        roles: ["admin", "funcionario"],
      },
      { to: "/app/banho-tosa", label: "Banho & tosa", icon: Bath, roles: ["admin", "funcionario"] },
    ],
  },
  {
    id: "clientes",
    label: "Tutores & Cães",
    icon: Users,
    items: [
      { to: "/app/tutores", label: "Tutores", icon: Users, roles: ["admin", "funcionario"] },
      { to: "/app/caes", label: "Cães", icon: Dog, roles: ["admin", "funcionario", "tutor"] },
      { to: "/app/saude", label: "Saúde", icon: HeartPulse, roles: ["admin", "funcionario"] },
    ],
  },
  {
    id: "conteudo",
    label: "Conteúdo para tutores",
    icon: Camera,
    items: [
      { to: "/app/boletins", label: "Boletins", icon: Newspaper, roles: ["admin", "funcionario"] },
      { to: "/app/stories", label: "Stories", icon: Camera, roles: ["admin", "funcionario"] },
    ],
  },
  {
    id: "comunicacao",
    label: "Comunicação",
    icon: MessageSquare,
    items: [
      {
        to: "/app/comunicacao",
        label: "Chat & avisos",
        icon: MessageSquare,
        roles: ["admin", "funcionario"],
      },
      {
        to: "/app/ocorrencias",
        label: "Ocorrências",
        icon: AlertCircle,
        roles: ["admin", "funcionario"],
      },
    ],
  },
  {
    id: "equipe",
    label: "Equipe",
    icon: UserCog,
    items: [
      { to: "/app/funcionarios", label: "Funcionários", icon: UserCog, roles: ["admin"] },
      { to: "/app/tarefas", label: "Tarefas", icon: ListChecks, roles: ["admin", "funcionario"] },
      {
        to: "/app/treinamento",
        label: "Treinamento",
        icon: GraduationCap,
        roles: ["admin", "funcionario"],
      },
    ],
  },
  {
    id: "financeiro",
    items: [
      { to: "/app/financeiro", label: "Financeiro", icon: Wallet, roles: ["admin"] },
    ],
  },
  {
    id: "documentos",
    items: [
      {
        to: "/app/documentos",
        label: "Documentos",
        icon: FileText,
        roles: ["admin", "funcionario"],
      },
    ],
  },
  {
    id: "assinatura",
    items: [{ to: "/app/assinatura", label: "Assinatura", icon: CreditCard, roles: ["admin"] }],
  },
  {
    id: "configuracoes",
    items: [{ to: "/app/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] }],
  },
];

// Lista "achatada", usada onde a estrutura em grupos não é necessária
// (ex.: navegação inferior mobile).
const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

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

  // Grupos visíveis para o papel atual (só entram grupos com pelo menos 1 item permitido)
  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.roles.includes(role)),
      })).filter((g) => g.items.length > 0),
    [role],
  );

  // Expande automaticamente o grupo que contém a rota atual
  const activeGroupId = visibleGroups.find((g) =>
    g.items.some((i) => pathname === i.to || (i.to !== "/app" && pathname.startsWith(i.to))),
  )?.id;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isGroupOpen = (id: string) => openGroups[id] ?? id === activeGroupId;
  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !isGroupOpen(id) }));

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-6 py-6">
          <BrandMark />
          <div>
            <p className="font-display text-base font-semibold leading-none text-sidebar-foreground">
              <BrandName />
            </p>
            <p className="text-xs text-sidebar-foreground/70">
              {role === "admin"
                ? "Administradora"
                : role === "funcionario"
                  ? "Funcionário"
                  : "Tutor"}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {visibleGroups.map((group) => {
            // Grupo sem label = item(ns) único(s), sem categoria visível
            // (ex.: Início, Documentos, Configurações). Renderiza todos os
            // itens do grupo — nunca só o primeiro — para que adicionar um
            // item novo aqui no futuro não esconda os demais silenciosamente.
            if (!group.label) {
              return group.items.map((item) => {
                const active =
                  pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
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
                  </Link>
                );
              });
            }

            const GroupIcon = group.icon ?? Folder;
            const open = isGroupOpen(group.id);
            const groupActive = group.id === activeGroupId;

            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    groupActive
                      ? "text-sidebar-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <GroupIcon className="h-4 w-4" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", open ? "rotate-180" : "")}
                  />
                </button>
                {open ? (
                  <div className="ml-4 space-y-0.5 border-l border-sidebar-border pl-3">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.to ||
                        (item.to !== "/app" && pathname.startsWith(item.to));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="flex-1">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
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
            <BrandMark size="sm" />
            <span className="font-display text-base font-semibold"><BrandName /></span>
          </Link>
          <Button size="sm" variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>

        <nav className="sticky bottom-0 grid grid-cols-4 border-t border-border bg-card lg:hidden">
          {items.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
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

function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const brand = useBrand();
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt={brand.name}
        className={cn("rounded-full object-cover", dim)}
      />
    );
  }
  return (
    <span
      className={cn("grid place-items-center rounded-full text-white", dim)}
      style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent})` }}
      aria-hidden
    >
      <PawPrint className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
    </span>
  );
}

function BrandName() {
  const brand = useBrand();
  return <>{brand.name}</>;
}
