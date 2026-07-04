import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import { FIXED_CATEGORIES, VARIABLE_CATEGORIES } from "@/lib/cost-engine";

const DAYS_PER_MONTH = 30;
const WORKING_HOURS_PER_DAY = 12;
const BOARDING_WEIGHT = 2;

function fmtBRL(v: number) {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtPct(v: number) {
  if (!isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

type SimState = {
  rentIncrease: number; // R$
  hires: number; // count
  hireSalary: number; // R$ each
  fires: number;
  salaryIncreasePct: number;
  daycareExtra: number; // vagas
  boardingExtra: number; // vagas
  occupancyIncreasePct: number; // % aumento sobre receita atual
  expenseReductionPct: number; // % redução em custos variáveis
  priceIncreasePct: number; // % aumento em preço serviços
};

const DEFAULT_SIM: SimState = {
  rentIncrease: 0,
  hires: 0,
  hireSalary: 2000,
  fires: 0,
  salaryIncreasePct: 0,
  daycareExtra: 0,
  boardingExtra: 0,
  occupancyIncreasePct: 0,
  expenseReductionPct: 0,
  priceIncreasePct: 0,
};

export function SimulationsTab({
  employees,
  expenses,
  income,
  unitSettings,
}: {
  employees: any[];
  expenses: any[];
  income: any[];
  unitSettings: any[];
}) {
  const [sim, setSim] = useState<SimState>(DEFAULT_SIM);

  const baseline = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthExpenses = expenses.filter((tx) => {
      const d = new Date(tx.due_date || tx.created_at);
      return d >= monthStart && d < monthEnd;
    });
    const monthIncome = income.filter((tx) => {
      const d = new Date(tx.paid_at || tx.due_date || tx.created_at);
      return d >= monthStart && d < monthEnd;
    });

    const active = employees.filter((e) => e.active);
    const salaries = active.reduce((a, e) => a + (Number(e.salary) || 0), 0);
    const avgSalary = active.length ? salaries / active.length : 0;

    const byCat = new Map<string, number>();
    for (const tx of monthExpenses) {
      const cat = (tx.expense_category || "outros") as string;
      if (cat === "salarios") continue;
      byCat.set(cat, (byCat.get(cat) ?? 0) + Number(tx.amount || 0));
    }
    const fixedFromExp = FIXED_CATEGORIES.filter((c) => c !== "salarios").reduce(
      (a, c) => a + (byCat.get(c) ?? 0),
      0,
    );
    const variable = VARIABLE_CATEGORIES.reduce((a, c) => a + (byCat.get(c) ?? 0), 0);
    const fixed = salaries + fixedFromExp;
    const operational = fixed + variable;
    const revenue = monthIncome.reduce((a, tx) => a + Number(tx.amount || 0), 0);
    const profit = revenue - operational;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const daycareCap = unitSettings.reduce(
      (a, s: any) => a + (s.daycare_capacity ?? 0),
      0,
    );
    const boardingCap = unitSettings.reduce(
      (a, s: any) => a + (s.boarding_capacity ?? 0),
      0,
    );

    return {
      revenue,
      salaries,
      avgSalary,
      fixedFromExp,
      variable,
      fixed,
      operational,
      profit,
      margin,
      daycareCap,
      boardingCap,
      activeCount: active.length,
    };
  }, [employees, expenses, income, unitSettings]);

  const scenario = useMemo(() => {
    const newSalaries =
      (baseline.salaries - sim.fires * baseline.avgSalary + sim.hires * sim.hireSalary) *
      (1 + sim.salaryIncreasePct / 100);
    const newFixed = Math.max(0, newSalaries + baseline.fixedFromExp + sim.rentIncrease);
    const newVariable = baseline.variable * (1 - sim.expenseReductionPct / 100);
    const newOperational = newFixed + newVariable;

    const newRevenue =
      baseline.revenue *
      (1 + sim.occupancyIncreasePct / 100) *
      (1 + sim.priceIncreasePct / 100);

    const newProfit = newRevenue - newOperational;
    const newMargin = newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0;

    const newDaily = newOperational / DAYS_PER_MONTH;
    const newHourly = newDaily / WORKING_HOURS_PER_DAY;

    const daycareCap = baseline.daycareCap + sim.daycareExtra;
    const boardingCap = baseline.boardingCap + sim.boardingExtra;
    const weighted = daycareCap + boardingCap * BOARDING_WEIGHT;
    const daycareBase =
      weighted > 0 && daycareCap > 0 ? newDaily / weighted : 0;
    const boardingBase =
      weighted > 0 && boardingCap > 0 ? (newDaily * BOARDING_WEIGHT) / weighted : 0;

    return {
      salaries: newSalaries,
      fixed: newFixed,
      variable: newVariable,
      operational: newOperational,
      revenue: newRevenue,
      profit: newProfit,
      margin: newMargin,
      daily: newDaily,
      hourly: newHourly,
      daycareBase,
      boardingBase,
      groomingMedium: newHourly * 1.0,
    };
  }, [baseline, sim]);

  const delta = (curr: number, base: number) => {
    if (!isFinite(base) || base === 0) return { abs: curr, pct: 0 };
    return { abs: curr - base, pct: ((curr - base) / Math.abs(base)) * 100 };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Simulador de Cenários
          </CardTitle>
          <CardDescription>
            Ajuste os parâmetros abaixo para simular impactos. Nada é salvo — os dados reais permanecem intactos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SimField label="Aumento de aluguel (R$/mês)">
              <Input
                type="number"
                value={sim.rentIncrease}
                onChange={(e) => setSim({ ...sim, rentIncrease: Number(e.target.value) || 0 })}
              />
            </SimField>

            <SimField label={`Contratar funcionários (nº)`}>
              <Input
                type="number"
                min={0}
                value={sim.hires}
                onChange={(e) => setSim({ ...sim, hires: Number(e.target.value) || 0 })}
              />
            </SimField>

            <SimField label="Salário por novo contratado (R$)">
              <Input
                type="number"
                value={sim.hireSalary}
                onChange={(e) => setSim({ ...sim, hireSalary: Number(e.target.value) || 0 })}
              />
            </SimField>

            <SimField label={`Demitir funcionários (nº)`}>
              <Input
                type="number"
                min={0}
                max={baseline.activeCount}
                value={sim.fires}
                onChange={(e) => setSim({ ...sim, fires: Number(e.target.value) || 0 })}
              />
            </SimField>

            <SimField label={`Aumento de salários: ${fmtPct(sim.salaryIncreasePct)}`}>
              <Slider
                value={[sim.salaryIncreasePct]}
                min={0}
                max={50}
                step={1}
                onValueChange={(v) => setSim({ ...sim, salaryIncreasePct: v[0] })}
              />
            </SimField>

            <SimField label={`Aumento capacidade creche: +${sim.daycareExtra} vagas`}>
              <Slider
                value={[sim.daycareExtra]}
                min={0}
                max={50}
                step={1}
                onValueChange={(v) => setSim({ ...sim, daycareExtra: v[0] })}
              />
            </SimField>

            <SimField label={`Aumento capacidade hospedagem: +${sim.boardingExtra} vagas`}>
              <Slider
                value={[sim.boardingExtra]}
                min={0}
                max={30}
                step={1}
                onValueChange={(v) => setSim({ ...sim, boardingExtra: v[0] })}
              />
            </SimField>

            <SimField label={`Aumento ocupação média: ${fmtPct(sim.occupancyIncreasePct)}`}>
              <Slider
                value={[sim.occupancyIncreasePct]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setSim({ ...sim, occupancyIncreasePct: v[0] })}
              />
            </SimField>

            <SimField label={`Redução de despesas variáveis: ${fmtPct(sim.expenseReductionPct)}`}>
              <Slider
                value={[sim.expenseReductionPct]}
                min={0}
                max={80}
                step={1}
                onValueChange={(v) => setSim({ ...sim, expenseReductionPct: v[0] })}
              />
            </SimField>

            <SimField label={`Aumento de preço dos serviços: ${fmtPct(sim.priceIncreasePct)}`}>
              <Slider
                value={[sim.priceIncreasePct]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setSim({ ...sim, priceIncreasePct: v[0] })}
              />
            </SimField>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSim(DEFAULT_SIM)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Resetar cenário
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultado da Simulação</CardTitle>
          <CardDescription>Comparação do cenário atual vs. cenário simulado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <CompareCard
              label="Receita mensal"
              baseline={baseline.revenue}
              scenario={scenario.revenue}
              delta={delta(scenario.revenue, baseline.revenue)}
              positive
            />
            <CompareCard
              label="Custo operacional"
              baseline={baseline.operational}
              scenario={scenario.operational}
              delta={delta(scenario.operational, baseline.operational)}
            />
            <CompareCard
              label="Lucro mensal"
              baseline={baseline.profit}
              scenario={scenario.profit}
              delta={delta(scenario.profit, baseline.profit)}
              positive
            />
            <CompareCard
              label="Margem"
              baseline={baseline.margin}
              scenario={scenario.margin}
              delta={delta(scenario.margin, baseline.margin)}
              positive
              suffix="%"
              isPct
            />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <SuggestedPrice
              label="Creche (custo/dia)"
              base={scenario.daycareBase}
              recPct={40}
            />
            <SuggestedPrice
              label="Hospedagem (custo/dia)"
              base={scenario.boardingBase}
              recPct={40}
            />
            <SuggestedPrice
              label="Banho porte médio"
              base={scenario.groomingMedium}
              recPct={40}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SimField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function CompareCard({
  label,
  baseline,
  scenario,
  delta,
  positive,
  suffix,
  isPct,
}: {
  label: string;
  baseline: number;
  scenario: number;
  delta: { abs: number; pct: number };
  positive?: boolean;
  suffix?: string;
  isPct?: boolean;
}) {
  const isImprovement = positive ? delta.abs >= 0 : delta.abs <= 0;
  const fmt = (v: number) => (isPct ? `${v.toFixed(1)}${suffix ?? ""}` : fmtBRL(v));
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{fmt(scenario)}</div>
      <div className="text-xs text-muted-foreground">Base: {fmt(baseline)}</div>
      <div
        className={`mt-2 flex items-center gap-1 text-xs font-medium ${
          isImprovement ? "text-green-600" : "text-red-600"
        }`}
      >
        {delta.abs >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPct
          ? `${delta.abs >= 0 ? "+" : ""}${delta.abs.toFixed(1)} p.p.`
          : `${delta.abs >= 0 ? "+" : ""}${fmtBRL(delta.abs)}`}
      </div>
    </div>
  );
}

function SuggestedPrice({ label, base, recPct }: { label: string; base: number; recPct: number }) {
  const rec = base * (1 + recPct / 100);
  return (
    <div className="rounded-lg border-2 border-primary/40 p-4">
      <div className="text-xs uppercase tracking-wide text-primary">{label}</div>
      <div className="text-xs text-muted-foreground">Custo: {fmtBRL(base)}</div>
      <div className="text-2xl font-bold">{fmtBRL(rec)}</div>
      <Badge variant="outline" className="mt-1">
        Recomendado (+{recPct}%)
      </Badge>
    </div>
  );
}
