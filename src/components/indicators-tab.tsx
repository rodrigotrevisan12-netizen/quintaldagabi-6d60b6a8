import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
} from "lucide-react";
import { FIXED_CATEGORIES, VARIABLE_CATEGORIES } from "@/lib/cost-engine";

const DAYS_PER_MONTH = 30;
const WORKING_HOURS_PER_DAY = 12;
const BOARDING_WEIGHT = 2;

type Severity = "positivo" | "atencao" | "critico" | "info";

type Insight = {
  severity: Severity;
  title: string;
  message: string;
};

function fmtBRL(v: number) {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtPct(v: number) {
  if (!isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start, end };
}

function sumByPeriod(txs: any[], start: Date, end: Date) {
  return txs
    .filter((tx) => {
      const d = new Date(tx.paid_at || tx.due_date || tx.created_at);
      return d >= start && d < end;
    })
    .reduce((a, tx) => a + Number(tx.amount || 0), 0);
}

export function IndicatorsTab({
  employees,
  expenses,
  income,
  unitSettings,
  daycareStays,
  boardingStays,
  groomingAppointments,
  daycarePackages,
  groomingServices,
}: {
  employees: any[];
  expenses: any[];
  income: any[];
  unitSettings: any[];
  daycareStays: any[];
  boardingStays: any[];
  groomingAppointments: any[];
  daycarePackages: any[];
  groomingServices: any[];
}) {
  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];

    const { start: curStart, end: curEnd } = monthRange(0);
    const { start: prevStart, end: prevEnd } = monthRange(-1);

    const revenueCur = sumByPeriod(income, curStart, curEnd);
    const revenuePrev = sumByPeriod(income, prevStart, prevEnd);
    const expenseCur = sumByPeriod(expenses, curStart, curEnd);
    const expensePrev = sumByPeriod(expenses, prevStart, prevEnd);

    const salaries = employees
      .filter((e) => e.active)
      .reduce((a, e) => a + (Number(e.salary) || 0), 0);

    // custos
    const byCat = new Map<string, number>();
    for (const tx of expenses.filter((tx) => {
      const d = new Date(tx.due_date || tx.created_at);
      return d >= curStart && d < curEnd;
    })) {
      const cat = (tx.expense_category || "outros") as string;
      if (cat === "salarios") continue;
      byCat.set(cat, (byCat.get(cat) ?? 0) + Number(tx.amount || 0));
    }
    const fixedFromExp = FIXED_CATEGORIES.filter((c) => c !== "salarios").reduce(
      (a, c) => a + (byCat.get(c) ?? 0),
      0,
    );
    const variable = VARIABLE_CATEGORIES.reduce((a, c) => a + (byCat.get(c) ?? 0), 0);
    const operational = salaries + fixedFromExp + variable;
    const profit = revenueCur - operational;
    const margin = revenueCur > 0 ? (profit / revenueCur) * 100 : 0;

    const dailyCost = operational / DAYS_PER_MONTH;
    const hourlyCost = dailyCost / WORKING_HOURS_PER_DAY;

    const daycareCap = unitSettings.reduce(
      (a, s: any) => a + (s.daycare_capacity ?? 0),
      0,
    );
    const boardingCap = unitSettings.reduce(
      (a, s: any) => a + (s.boarding_capacity ?? 0),
      0,
    );

    const weighted = daycareCap + boardingCap * BOARDING_WEIGHT;
    const daycareBaseCost =
      weighted > 0 && daycareCap > 0 ? dailyCost / weighted : 0;
    const boardingBaseCost =
      weighted > 0 && boardingCap > 0 ? (dailyCost * BOARDING_WEIGHT) / weighted : 0;

    // === Ocupação média (mês atual) ===
    const daycareOccupied = daycareStays.filter((s: any) => {
      const d = new Date(s.check_in_at);
      return d >= curStart && d < curEnd;
    }).length;
    const boardingOccupied = boardingStays.filter((s: any) => {
      const d = new Date(s.check_in_at);
      return d >= curStart && d < curEnd;
    }).length;

    const daycareOccupancy =
      daycareCap > 0 ? (daycareOccupied / (daycareCap * DAYS_PER_MONTH)) * 100 : 0;
    const boardingOccupancy =
      boardingCap > 0 ? (boardingOccupied / (boardingCap * DAYS_PER_MONTH)) * 100 : 0;

    // === Margem por serviço (mês atual) — receita por categoria ===
    const revenueByCat = new Map<string, number>();
    for (const tx of income.filter((tx) => {
      const d = new Date(tx.paid_at || tx.due_date || tx.created_at);
      return d >= curStart && d < curEnd;
    })) {
      const c = (tx.revenue_category || "outros") as string;
      revenueByCat.set(c, (revenueByCat.get(c) ?? 0) + Number(tx.amount || 0));
    }
    const daycareRevenue =
      (revenueByCat.get("creche") ?? 0) + (revenueByCat.get("mensalidade_creche") ?? 0);
    const boardingRevenue = revenueByCat.get("hospedagem") ?? 0;
    const groomingRevenue = revenueByCat.get("banho_tosa") ?? 0;

    // === Pacotes creche vs custo ===
    for (const pkg of daycarePackages) {
      const pricePerDay =
        pkg.days_per_week > 0 ? pkg.monthly_price / (pkg.days_per_week * 4) : 0;
      if (daycareBaseCost > 0 && pricePerDay > 0 && pricePerDay < daycareBaseCost) {
        list.push({
          severity: "critico",
          title: `Pacote "${pkg.name}" abaixo do custo`,
          message: `A diária efetiva (${fmtBRL(pricePerDay)}) está abaixo do custo por vaga (${fmtBRL(daycareBaseCost)}). Cada cão nesse pacote gera prejuízo — reavalie o valor ou reduza custos.`,
        });
      }
    }

    // === Preço banho/tosa por porte vs custo ===
    const groomingHoursBySize: Record<string, number> = {
      pequeno: 0.75,
      medio: 1,
      médio: 1,
      grande: 1.5,
    };
    for (const svc of groomingServices) {
      const size = (svc.size || svc.porte || "").toString().toLowerCase();
      const hours = groomingHoursBySize[size] ?? 1;
      const cost = hourlyCost * hours;
      const price = Number(svc.price ?? svc.base_price ?? 0);
      if (price > 0 && cost > 0) {
        const svcMargin = ((price - cost) / price) * 100;
        if (svcMargin < 10) {
          list.push({
            severity: "atencao",
            title: `Baixa rentabilidade: ${svc.name}`,
            message: `Margem estimada de ${fmtPct(svcMargin)} sobre o custo (${fmtBRL(cost)}). Considere reajuste ou otimização do tempo de execução.`,
          });
        }
      }
    }

    // === Comparações mês a mês ===
    if (revenuePrev > 0) {
      const revenueDelta = ((revenueCur - revenuePrev) / revenuePrev) * 100;
      if (revenueDelta >= 5) {
        list.push({
          severity: "positivo",
          title: "Receita em crescimento",
          message: `A receita subiu ${fmtPct(revenueDelta)} vs. o mês anterior (${fmtBRL(revenueCur)} vs. ${fmtBRL(revenuePrev)}). Bom momento para reinvestir na captação.`,
        });
      } else if (revenueDelta <= -5) {
        list.push({
          severity: "atencao",
          title: "Receita em queda",
          message: `A receita caiu ${fmtPct(Math.abs(revenueDelta))} em relação ao mês anterior. Verifique cancelamentos, sazonalidade e ações comerciais.`,
        });
      }
    }

    if (expensePrev > 0) {
      const expenseDelta = ((expenseCur - expensePrev) / expensePrev) * 100;
      if (expenseDelta >= 10) {
        list.push({
          severity: "atencao",
          title: "Custos em alta",
          message: `Suas despesas aumentaram ${fmtPct(expenseDelta)} em relação ao mês anterior. Revise os lançamentos por categoria na aba Custos.`,
        });
      } else if (expenseDelta <= -10) {
        list.push({
          severity: "positivo",
          title: "Custos em queda",
          message: `Você reduziu ${fmtPct(Math.abs(expenseDelta))} das despesas vs. o mês anterior. Ótimo controle operacional.`,
        });
      }
    }

    // === Margem ===
    if (revenueCur > 0) {
      if (margin < 0) {
        list.push({
          severity: "critico",
          title: "Operação com prejuízo",
          message: `A margem líquida está negativa (${fmtPct(margin)}). O custo operacional (${fmtBRL(operational)}) supera a receita (${fmtBRL(revenueCur)}). Ajuste urgente de preços ou de custos.`,
        });
      } else if (margin < 15) {
        list.push({
          severity: "atencao",
          title: "Margem apertada",
          message: `Margem líquida de ${fmtPct(margin)} está abaixo do ideal (20-30%). Explore o simulador para testar aumento de preço ou redução de despesas.`,
        });
      } else if (margin >= 30) {
        list.push({
          severity: "positivo",
          title: "Margem saudável",
          message: `Margem líquida de ${fmtPct(margin)}. Excelente equilíbrio entre receita e custo operacional.`,
        });
      }
    }

    // === Ocupação ===
    if (daycareCap > 0) {
      if (daycareOccupancy < 50) {
        list.push({
          severity: "atencao",
          title: "Creche com baixa ocupação",
          message: `Ocupação média de ${fmtPct(daycareOccupancy)} no mês. Ainda há espaço para captar clientes sem aumentar custos fixos.`,
        });
      } else if (daycareOccupancy >= 85) {
        list.push({
          severity: "positivo",
          title: "Creche próxima do limite",
          message: `Ocupação de ${fmtPct(daycareOccupancy)}. Avalie ampliar capacidade — no simulador é possível testar o impacto financeiro.`,
        });
      }
    }
    if (boardingCap > 0) {
      if (boardingOccupancy < 40) {
        list.push({
          severity: "atencao",
          title: "Hospedagem ociosa",
          message: `Ocupação média de ${fmtPct(boardingOccupancy)}. Considere promoções em datas de baixa demanda.`,
        });
      }
    }

    // === Comparação de margem entre serviços ===
    const services: { name: string; revenue: number; costEst: number }[] = [
      {
        name: "Creche",
        revenue: daycareRevenue,
        costEst: daycareBaseCost * daycareOccupied,
      },
      {
        name: "Hospedagem",
        revenue: boardingRevenue,
        costEst: boardingBaseCost * boardingOccupied,
      },
      {
        name: "Banho e Tosa",
        revenue: groomingRevenue,
        costEst: hourlyCost * groomingAppointments.filter((a: any) => {
          const d = new Date(a.scheduled_at || a.created_at);
          return d >= curStart && d < curEnd;
        }).length,
      },
    ].filter((s) => s.revenue > 0);

    if (services.length >= 2) {
      const withMargin = services.map((s) => ({
        ...s,
        margin: s.revenue > 0 ? ((s.revenue - s.costEst) / s.revenue) * 100 : 0,
      }));
      const best = [...withMargin].sort((a, b) => b.margin - a.margin)[0];
      list.push({
        severity: "info",
        title: `${best.name} lidera em margem`,
        message: `Entre os serviços com receita no mês, ${best.name} tem a maior margem estimada (${fmtPct(best.margin)}). Considere direcionar esforço comercial para esse serviço.`,
      });
    }

    if (list.length === 0) {
      list.push({
        severity: "info",
        title: "Sem alertas no momento",
        message: "Ainda não há dados suficientes ou variações relevantes para gerar interpretações. Registre receitas e despesas para receber análises automáticas.",
      });
    }

    return list;
  }, [
    employees,
    expenses,
    income,
    unitSettings,
    daycareStays,
    boardingStays,
    groomingAppointments,
    daycarePackages,
    groomingServices,
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Indicadores & Interpretações
          </CardTitle>
          <CardDescription>
            Análises automáticas em linguagem simples, com base nos dados reais da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((ins, i) => (
            <InsightRow key={i} insight={ins} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const cfg: Record<
    Severity,
    { icon: React.ReactNode; badge: string; border: string }
  > = {
    positivo: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      badge: "Positivo",
      border: "border-l-4 border-l-green-500",
    },
    atencao: {
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      badge: "Atenção",
      border: "border-l-4 border-l-yellow-500",
    },
    critico: {
      icon: <TrendingDown className="h-5 w-5 text-red-600" />,
      badge: "Crítico",
      border: "border-l-4 border-l-red-500",
    },
    info: {
      icon: <Info className="h-5 w-5 text-blue-600" />,
      badge: "Informação",
      border: "border-l-4 border-l-blue-500",
    },
  };
  const c = cfg[insight.severity];
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${c.border}`}>
      <div className="mt-0.5">{c.icon}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{insight.title}</h4>
          <Badge variant="outline" className="text-xs">
            {c.badge}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{insight.message}</p>
      </div>
    </div>
  );
}
