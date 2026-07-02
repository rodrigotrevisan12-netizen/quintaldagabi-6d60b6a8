import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Tags,
  Receipt,
  FlaskConical,
  TrendingUp,
  FileBarChart,
  Construction,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/inteligencia-financeira")({
  head: () => ({ meta: [{ title: "Inteligência Financeira — Quintal da Gabi" }] }),
  component: InteligenciaFinanceiraPage,
});

/* ------------------------------------------------------------------ */
/*  Placeholder reutilizável para abas ainda não implementadas        */
/* ------------------------------------------------------------------ */

function EmptyTabPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </span>
      <div className="max-w-md space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        <Construction className="h-3.5 w-3.5" />
        Em desenvolvimento
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Configuração das abas                                             */
/* ------------------------------------------------------------------ */

const TABS = [
  {
    value: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    title: "Dashboard Financeiro",
    description:
      "Visão consolidada de receitas, despesas, margens e indicadores-chave do negócio. Os dados serão alimentados automaticamente a partir dos módulos existentes.",
  },
  {
    value: "precificacao",
    label: "Precificação",
    icon: Tags,
    title: "Precificação de Serviços",
    description:
      "Definição e ajuste de preços para creche, hospedagem, banho & tosa e demais serviços. Futuramente incluirá sugestões baseadas em custo e margem desejada.",
  },
  {
    value: "custos",
    label: "Custos",
    icon: Receipt,
    title: "Gestão de Custos",
    description:
      "Mapeamento de custos fixos e variáveis por serviço. Permitirá o cálculo de custo unitário e a identificação de oportunidades de redução.",
  },
  {
    value: "simulacoes",
    label: "Simulações",
    icon: FlaskConical,
    title: "Simulações Financeiras",
    description:
      "Simulação de cenários como alterações de preço, volume de atendimentos e variação de custos para apoiar a tomada de decisão.",
  },
  {
    value: "indicadores",
    label: "Indicadores",
    icon: TrendingUp,
    title: "Indicadores de Desempenho",
    description:
      "KPIs financeiros e operacionais: margem de contribuição, ticket médio, taxa de ocupação, ponto de equilíbrio e mais.",
  },
  {
    value: "relatorios",
    label: "Relatórios",
    icon: FileBarChart,
    title: "Relatórios Gerenciais",
    description:
      "Relatórios detalhados com exportação em PDF e Excel. Inclui DRE simplificado, fluxo de caixa e análise por serviço.",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Página principal                                                  */
/* ------------------------------------------------------------------ */

function InteligenciaFinanceiraPage() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">
          Centro de Inteligência Financeira e Precificação
        </h1>
        <p className="text-muted-foreground">
          Análise consolidada, precificação estratégica e simulações financeiras.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon className="mr-1.5 h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <tab.icon className="h-5 w-5 text-primary" />
                  {tab.title}
                </CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyTabPlaceholder
                  icon={tab.icon}
                  title={tab.title}
                  description={tab.description}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
