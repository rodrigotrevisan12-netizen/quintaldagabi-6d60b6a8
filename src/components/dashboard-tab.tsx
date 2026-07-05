import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Percent,
  Ticket,
  Users,
  Dog,
  Building2,
  Award,
  AlertTriangle,
  Bed,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { classifyCategory } from "@/lib/cost-engine";

const fmtBRL = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${(v || 0).toFixed(1)}%`;

const COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

interface Props {
  income: any[];
  expenses: any[];
  employees: any[];
  unitSettings: any[];
  daycareStays: any[];
  boardingStays: any[];
  groomingAppointments: any[];
  dogsCount: number;
}

export function DashboardTab({
  income,
  expenses,
  employees,
  unitSettings,
  daycareStays,
  boardingStays,
  groomingAppointments,
  dogsCount,
}: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const inMonth = (d: any, s: Date, e: Date) => {
      const x = new Date(d);
      return x >= s && x < e;
    };

    const monthIncome = income.filter((t) =>
      inMonth(t.paid_at || t.due_date || t.created_at, monthStart, monthEnd),
    );
    const monthExpense = expenses.filter((t) =>
      inMonth(t.due_date || t.created_at, monthStart, monthEnd),
    );
    const prevIncome = income.filter((t) =>
      inMonth(t.paid_at || t.due_date || t.created_at, prevStart, monthStart),
    );
    const prevExpense = expenses.filter((t) =>
      inMonth(t.due_date || t.created_at, prevStart, monthStart),
    );

    const revenue = monthIncome.reduce((a, t) => a + Number(t.amount || 0), 0);
    const expense = monthExpense.reduce((a, t) => a + Number(t.amount || 0), 0);
    const salaries = employees
      .filter((e) => e.active)
      .reduce((a, e) => a + Number(e.salary || 0), 0);
    const totalExpense = expense + salaries;
    const profit = revenue - totalExpense;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const prevRevenue = prevIncome.reduce((a, t) => a + Number(t.amount || 0), 0);
    const prevExpenseTotal =
      prevExpense.reduce((a, t) => a + Number(t.amount || 0), 0) + salaries;
    const prevProfit = prevRevenue - prevExpenseTotal;
    const revenueDelta =
      prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expenseDelta =
      prevExpenseTotal > 0
        ? ((totalExpense - prevExpenseTotal) / prevExpenseTotal) * 100
        : 0;
    const profitDelta = prevProfit !== 0 ? profit - prevProfit : 0;

    const activeEmployees = employees.filter((e) => e.active);
    const perEmployee = activeEmployees.length ? revenue / activeEmployees.length : 0;
    const perDog = dogsCount > 0 ? revenue / dogsCount : 0;
    const ticket = monthIncome.length ? revenue / monthIncome.length : 0;

    // Receita por serviço/categoria
    const byService = new Map<string, number>();
    for (const t of monthIncome) {
      const c = (t.revenue_category || "outros") as string;
      byService.set(c, (byService.get(c) ?? 0) + Number(t.amount || 0));
    }
    const serviceRows = Array.from(byService.entries())
      .map(([k, v]) => ({ name: k, value: v }))
      .sort((a, b) => b.value - a.value);
    const mostProfitable = serviceRows[0];
    const leastProfitable = serviceRows[serviceRows.length - 1];

    // Receita por unidade
    const byUnit = new Map<string, number>();
    for (const t of monthIncome) {
      const u = t.unit_id || "principal";
      byUnit.set(u, (byUnit.get(u) ?? 0) + Number(t.amount || 0));
    }
    const unitRows = unitSettings.map((s: any) => ({
      name: s.unit?.name ?? "Principal",
      value: byUnit.get(s.unit_id) ?? 0,
    }));

    // Ocupações
    const daycareCap = unitSettings.reduce(
      (a: number, s: any) => a + Number(s.daycare_capacity || 0),
      0,
    );
    const boardingCap = unitSettings.reduce(
      (a: number, s: any) => a + Number(s.boarding_capacity || 0),
      0,
    );
    const daycareInMonth = daycareStays.filter((s) =>
      inMonth(s.check_in_at, monthStart, monthEnd),
    );
    const boardingInMonth = boardingStays.filter((s) =>
      inMonth(s.check_in_at, monthStart, monthEnd),
    );
    const daysInMonth = Math.max(
      1,
      Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000),
    );
    const daycareOcc =
      daycareCap > 0
        ? Math.min(100, (daycareInMonth.length / (daycareCap * daysInMonth)) * 100)
        : 0;
    const boardingOcc =
      boardingCap > 0
        ? Math.min(100, (boardingInMonth.length / (boardingCap * daysInMonth)) * 100)
        : 0;

    // Série últimos 6 meses
    const series: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const r = income
        .filter((t) => inMonth(t.paid_at || t.due_date || t.created_at, s, e))
        .reduce((a, t) => a + Number(t.amount || 0), 0);
      const x =
        expenses
          .filter((t) => inMonth(t.due_date || t.created_at, s, e))
          .reduce((a, t) => a + Number(t.amount || 0), 0) + salaries;
      series.push({
        month: s.toLocaleDateString("pt-BR", { month: "short" }),
        Receita: r,
        Despesa: x,
        Lucro: r - x,
      });
    }

    // Despesas por grupo
    const fixedTotal =
      salaries +
      monthExpense
        .filter(
          (t) =>
            classifyCategory(t.expense_category) === "fixo" &&
            t.expense_category !== "salarios",
        )
        .reduce((a, t) => a + Number(t.amount || 0), 0);
    const variableTotal = monthExpense
      .filter((t) => classifyCategory(t.expense_category) === "variavel")
      .reduce((a, t) => a + Number(t.amount || 0), 0);

    return {
      revenue,
      totalExpense,
      profit,
      margin,
      ticket,
      perEmployee,
      perDog,
      unitRows,
      mostProfitable,
      leastProfitable,
      daycareOcc,
      boardingOcc,
      series,
      serviceRows,
      revenueDelta,
      expenseDelta,
      profitDelta,
      fixedTotal,
      variableTotal,
      activeEmployeesCount: activeEmployees.length,
    };
  }, [
    income,
    expenses,
    employees,
    unitSettings,
    daycareStays,
    boardingStays,
    dogsCount,
  ]);

  const insights = useMemo(() => {
    const list: { type: "positive" | "warning" | "info"; text: string }[] = [];
    if (data.margin < 10 && data.revenue > 0)
      list.push({
        type: "warning",
        text: `Sua margem líquida está em ${fmtPct(data.margin)} — considerada baixa. Revise custos ou reajuste preços.`,
      });
    if (data.margin >= 25)
      list.push({
        type: "positive",
        text: `Excelente! Sua margem líquida está em ${fmtPct(data.margin)}, acima da média do setor.`,
      });
    if (data.revenueDelta > 5)
      list.push({
        type: "positive",
        text: `O faturamento cresceu ${fmtPct(data.revenueDelta)} em relação ao mês anterior.`,
      });
    if (data.revenueDelta < -5)
      list.push({
        type: "warning",
        text: `O faturamento caiu ${fmtPct(Math.abs(data.revenueDelta))} em relação ao mês anterior.`,
      });
    if (data.expenseDelta > 10)
      list.push({
        type: "warning",
        text: `Suas despesas cresceram ${fmtPct(data.expenseDelta)} em relação ao mês anterior — investigue as categorias de maior aumento.`,
      });
    if (data.revenueDelta > 0 && data.expenseDelta > data.revenueDelta)
      list.push({
        type: "warning",
        text: `A receita cresceu, mas os custos cresceram ainda mais (${fmtPct(data.expenseDelta)} vs ${fmtPct(data.revenueDelta)}). A rentabilidade está sob pressão.`,
      });
    if (data.daycareOcc < 60 && data.daycareOcc > 0)
      list.push({
        type: "info",
        text: `A ocupação média da creche está em ${fmtPct(data.daycareOcc)}, abaixo da capacidade instalada. Considere ações de marketing.`,
      });
    if (data.daycareOcc >= 85)
      list.push({
        type: "positive",
        text: `Creche operando próxima do limite (${fmtPct(data.daycareOcc)}). Avalie expandir a capacidade.`,
      });
    if (data.boardingOcc < 50 && data.boardingOcc > 0)
      list.push({
        type: "info",
        text: `Hospedagem com ocupação de ${fmtPct(data.boardingOcc)}. Há espaço para campanhas sazonais.`,
      });
    if (data.mostProfitable)
      list.push({
        type: "positive",
        text: `O serviço mais lucrativo do mês é "${data.mostProfitable.name}" (${fmtBRL(data.mostProfitable.value)}).`,
      });
    if (data.leastProfitable && data.leastProfitable !== data.mostProfitable)
      list.push({
        type: "info",
        text: `"${data.leastProfitable.name}" foi seu serviço com menor faturamento. Avalie mix de vendas ou reajuste.`,
      });
    if (data.daycareOcc > 0 && data.daycareOcc < 80)
      list.push({
        type: "info",
        text: `Simulação rápida: se a ocupação da creche subir para 80%, sua receita pode aumentar em aproximadamente ${fmtPct(80 - data.daycareOcc)}.`,
      });
    if (data.profit < 0)
      list.push({
        type: "warning",
        text: `Sua operação encerrou o mês com prejuízo de ${fmtBRL(Math.abs(data.profit))}. Ação corretiva urgente.`,
      });
    return list;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Receita do Mês"
          value={fmtBRL(data.revenue)}
          delta={data.revenueDelta}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Despesas do Mês"
          value={fmtBRL(data.totalExpense)}
          delta={data.expenseDelta}
          invertColor
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          label="Lucro Líquido"
          value={fmtBRL(data.profit)}
          icon={<PiggyBank className="h-4 w-4" />}
          highlight={data.profit >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Margem de Lucro"
          value={fmtPct(data.margin)}
          icon={<Percent className="h-4 w-4" />}
          highlight={
            data.margin >= 20 ? "positive" : data.margin < 10 ? "negative" : undefined
          }
        />
        <KpiCard
          label="Ticket Médio"
          value={fmtBRL(data.ticket)}
          icon={<Ticket className="h-4 w-4" />}
        />
        <KpiCard
          label="Receita / Funcionário"
          value={fmtBRL(data.perEmployee)}
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          label="Receita / Cão"
          value={fmtBRL(data.perDog)}
          icon={<Dog className="h-4 w-4" />}
        />
        <KpiCard
          label="Receita / Unidade"
          value={fmtBRL(
            data.unitRows.length
              ? data.revenue / data.unitRows.length
              : data.revenue,
          )}
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      {/* Insights Inteligentes */}
      <Card className="border-primary/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Insights Inteligentes</CardTitle>
          </div>
          <CardDescription>
            Recomendações geradas automaticamente com base nos dados do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Sem insights suficientes para o período atual. Registre movimentações
              para receber recomendações.
            </p>
          )}
          {insights.map((i, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                i.type === "positive"
                  ? "border-green-500/30 bg-green-500/5"
                  : i.type === "warning"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-blue-500/30 bg-blue-500/5"
              }`}
            >
              {i.type === "positive" ? (
                <Award className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              ) : i.type === "warning" ? (
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              ) : (
                <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              )}
              <span>{i.text}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Serviço mais/menos lucrativo & Ocupações */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Serviço mais lucrativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-lg font-semibold capitalize">
                  {data.mostProfitable?.name ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.mostProfitable ? fmtBRL(data.mostProfitable.value) : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Serviço menos lucrativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-lg font-semibold capitalize">
                  {data.leastProfitable?.name ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.leastProfitable ? fmtBRL(data.leastProfitable.value) : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <OccupancyCard
          label="Ocupação Creche"
          value={data.daycareOcc}
          icon={<Users className="h-5 w-5" />}
        />
        <OccupancyCard
          label="Ocupação Hospedagem"
          value={data.boardingOcc}
          icon={<Bed className="h-5 w-5" />}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução Financeira (6 meses)</CardTitle>
            <CardDescription>Receita, despesa e lucro mês a mês</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  width={70}
                />
                <Tooltip formatter={(v: any) => fmtBRL(v)} />
                <Legend />
                <Line type="monotone" dataKey="Receita" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Despesa" stroke="#ef4444" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="Lucro"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por Categoria</CardTitle>
            <CardDescription>Distribuição do faturamento no mês</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {data.serviceRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem receitas no mês.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.serviceRows}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                  >
                    {data.serviceRows.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtBRL(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita por Unidade</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {data.unitRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma unidade cadastrada.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.unitRows}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={70} />
                  <Tooltip formatter={(v: any) => fmtBRL(v)} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  delta,
  invertColor,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  delta?: number;
  invertColor?: boolean;
  highlight?: "positive" | "negative";
}) {
  const showDelta = typeof delta === "number" && isFinite(delta) && delta !== 0;
  const good = invertColor ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  return (
    <Card
      className={
        highlight === "positive"
          ? "border-green-500/40"
          : highlight === "negative"
            ? "border-red-500/40"
            : undefined
      }
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {showDelta && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {good ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={good ? "text-green-600" : "text-red-600"}>
              {fmtPct(Math.abs(delta!))} vs mês anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OccupancyCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <div className="text-2xl font-bold">{fmtPct(value)}</div>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
        <Badge variant="outline" className="mt-2 text-xs">
          {value >= 80 ? "Alta" : value >= 50 ? "Média" : "Baixa"}
        </Badge>
      </CardContent>
    </Card>
  );
}
