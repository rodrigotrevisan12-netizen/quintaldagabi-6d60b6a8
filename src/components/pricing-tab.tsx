import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, Info } from "lucide-react";
import { FIXED_CATEGORIES, VARIABLE_CATEGORIES } from "@/lib/cost-engine";

const STORAGE_KEY = "pricing-settings-v1";
const DAYS_PER_MONTH = 30;
const WORKING_HOURS_PER_DAY = 12;

// Peso relativo de esforço/estrutura por serviço (para ratear o custo operacional diário)
const BOARDING_WEIGHT = 2; // hospedagem consome ~2x mais recurso que uma vaga de creche
const GROOMING_WEIGHT_PER_HOUR = 1; // 1 hora de tosa ~ 1 vaga-dia de creche em custo indireto

type PricingSettings = {
  minMarginPct: number;
  recommendedPct: number;
  premiumPct: number;
};

const DEFAULT_SETTINGS: PricingSettings = {
  minMarginPct: 20,
  recommendedPct: 40,
  premiumPct: 70,
};

function fmtBRL(v: number) {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function loadSettings(): PricingSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function PricingTab({
  employees,
  expenses,
  unitSettings,
}: {
  employees: any[];
  expenses: any[];
  unitSettings: any[];
}) {
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const saveSettings = (next: PricingSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const costs = useMemo(() => {
    const activeEmployees = employees.filter((e) => e.active);
    const salariesTotal = activeEmployees.reduce(
      (a, e) => a + (Number(e.salary) || 0),
      0,
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthExpenses = expenses.filter((tx: any) => {
      const d = new Date(tx.due_date || tx.created_at);
      return d >= monthStart && d < monthEnd;
    });

    const byCategory = new Map<string, number>();
    for (const tx of monthExpenses) {
      const cat = (tx.expense_category || "outros") as string;
      if (cat === "salarios") continue;
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(tx.amount || 0));
    }
    const fixedFromExpenses = FIXED_CATEGORIES.filter((c) => c !== "salarios").reduce(
      (a, c) => a + (byCategory.get(c) ?? 0),
      0,
    );
    const variableTotal = VARIABLE_CATEGORIES.reduce(
      (a, c) => a + (byCategory.get(c) ?? 0),
      0,
    );
    const fixedTotal = salariesTotal + fixedFromExpenses;
    const operationalTotal = fixedTotal + variableTotal;
    const dailyCost = operationalTotal / DAYS_PER_MONTH;
    const hourlyCost = dailyCost / WORKING_HOURS_PER_DAY;

    const daycareCapacity = unitSettings.reduce(
      (a, s: any) => a + (s.daycare_capacity ?? 0),
      0,
    );
    const boardingCapacity = unitSettings.reduce(
      (a, s: any) => a + (s.boarding_capacity ?? 0),
      0,
    );

    return {
      operationalTotal,
      fixedTotal,
      variableTotal,
      dailyCost,
      hourlyCost,
      daycareCapacity,
      boardingCapacity,
      activeEmployees: activeEmployees.length,
    };
  }, [employees, expenses, unitSettings]);

  // Rateio do custo diário entre creche + hospedagem
  const weightedSlots =
    costs.daycareCapacity + costs.boardingCapacity * BOARDING_WEIGHT;

  const daycareBaseCost =
    weightedSlots > 0 && costs.daycareCapacity > 0
      ? (costs.dailyCost * costs.daycareCapacity) / weightedSlots / costs.daycareCapacity
      : 0;

  const boardingBaseCost =
    weightedSlots > 0 && costs.boardingCapacity > 0
      ? (costs.dailyCost * costs.boardingCapacity * BOARDING_WEIGHT) /
        weightedSlots /
        costs.boardingCapacity
      : 0;

  // Banho e tosa: baseado em horas de trabalho + rateio indireto
  const groomingHoursBySize: Record<string, number> = {
    Pequeno: 0.75,
    Médio: 1.0,
    Grande: 1.5,
  };

  const grooming = Object.entries(groomingHoursBySize).map(([size, hours]) => {
    const baseCost = costs.hourlyCost * hours * GROOMING_WEIGHT_PER_HOUR;
    return { size, hours, baseCost };
  });

  const applyMarkup = (cost: number, pct: number) => cost * (1 + pct / 100);

  const priceRow = (cost: number) => ({
    min: applyMarkup(cost, settings.minMarginPct),
    rec: applyMarkup(cost, settings.recommendedPct),
    prem: applyMarkup(cost, settings.premiumPct),
  });

  const daycarePrices = priceRow(daycareBaseCost);
  const boardingPrices = priceRow(boardingBaseCost);

  return (
    <div className="space-y-6">
      {/* ============ Configurações ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configurações de Precificação
          </CardTitle>
          <CardDescription>
            Defina as margens aplicadas sobre o custo. Alterações recalculam os preços automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Margem mínima (%)</Label>
              <Input
                type="number"
                min={0}
                value={settings.minMarginPct}
                onChange={(e) =>
                  saveSettings({ ...settings, minMarginPct: Number(e.target.value) || 0 })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Preço mínimo = custo × (1 + margem mínima)
              </p>
            </div>
            <div>
              <Label>Preço recomendado (%)</Label>
              <Input
                type="number"
                min={0}
                value={settings.recommendedPct}
                onChange={(e) =>
                  saveSettings({ ...settings, recommendedPct: Number(e.target.value) || 0 })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">Markup ideal com margem saudável.</p>
            </div>
            <div>
              <Label>Preço premium (%)</Label>
              <Input
                type="number"
                min={0}
                value={settings.premiumPct}
                onChange={(e) =>
                  saveSettings({ ...settings, premiumPct: Number(e.target.value) || 0 })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Para clientes que valorizam serviço diferenciado.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => saveSettings(DEFAULT_SETTINGS)}>
              Restaurar padrão (20 / 40 / 70)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ============ Bases de cálculo ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Base de Cálculo Automática
          </CardTitle>
          <CardDescription>
            Dados vindos do módulo Financeiro, Funcionários e Configurações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 text-sm">
            <Metric label="Custo operacional / mês" value={fmtBRL(costs.operationalTotal)} />
            <Metric label="Custo diário" value={fmtBRL(costs.dailyCost)} />
            <Metric label="Custo por hora" value={fmtBRL(costs.hourlyCost)} />
            <Metric label="Capacidade creche" value={`${costs.daycareCapacity} vagas`} />
            <Metric label="Capacidade hospedagem" value={`${costs.boardingCapacity} vagas`} />
            <Metric label="Funcionários ativos" value={String(costs.activeEmployees)} />
          </div>
        </CardContent>
      </Card>

      {/* ============ Creche ============ */}
      <PricingServiceCard
        title="Creche (diária)"
        baseCost={daycareBaseCost}
        prices={daycarePrices}
        explanation={
          costs.daycareCapacity === 0
            ? "Cadastre a capacidade de creche em Configurações para calcular."
            : `Custo diário total (${fmtBRL(costs.dailyCost)}) rateado entre creche e hospedagem — hospedagem pesa ${BOARDING_WEIGHT}× por exigir mais estrutura. Dividido pela capacidade de ${costs.daycareCapacity} vagas resulta em ${fmtBRL(daycareBaseCost)} de custo por cão/dia. Aplicando as margens definidas, chegamos aos preços sugeridos.`
        }
      />

      {/* ============ Hospedagem ============ */}
      <PricingServiceCard
        title="Hospedagem (diária)"
        baseCost={boardingBaseCost}
        prices={boardingPrices}
        explanation={
          costs.boardingCapacity === 0
            ? "Cadastre a capacidade de hospedagem em Configurações para calcular."
            : `Hospedagem recebe peso ${BOARDING_WEIGHT}× no rateio do custo diário (${fmtBRL(costs.dailyCost)}) para cobrir alimentação, limpeza, acompanhamento noturno e maior dedicação da equipe. Dividido pelas ${costs.boardingCapacity} vagas gera ${fmtBRL(boardingBaseCost)} de custo por cão/dia, sobre o qual aplicamos as margens.`
        }
      />

      {/* ============ Banho e Tosa ============ */}
      <Card>
        <CardHeader>
          <CardTitle>Banho e Tosa — por porte</CardTitle>
          <CardDescription>
            Preço calculado a partir do custo por hora ({fmtBRL(costs.hourlyCost)}) multiplicado pelo tempo médio de atendimento de cada porte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {grooming.map((g) => {
            const prices = priceRow(g.baseCost);
            return (
              <div key={g.size} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Porte {g.size}</h4>
                    <p className="text-xs text-muted-foreground">
                      Tempo médio: {g.hours * 60} min · Custo base: {fmtBRL(g.baseCost)}
                    </p>
                  </div>
                  <Badge variant="outline">{g.hours}h</Badge>
                </div>
                <PriceTriad prices={prices} />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Explicação: tempo médio × custo por hora define o custo direto de mão de obra. As margens configuradas acima geram os três preços sugeridos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function PricingServiceCard({
  title,
  baseCost,
  prices,
  explanation,
}: {
  title: string;
  baseCost: number;
  prices: { min: number; rec: number; prem: number };
  explanation: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Custo base por cão/dia: {fmtBRL(baseCost)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <PriceTriad prices={prices} />
        <p className="text-xs text-muted-foreground">{explanation}</p>
      </CardContent>
    </Card>
  );
}

function PriceTriad({ prices }: { prices: { min: number; rec: number; prem: number } }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-lg border p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Preço mínimo</div>
        <div className="text-2xl font-bold">{fmtBRL(prices.min)}</div>
        <div className="text-xs text-muted-foreground">Sem prejuízo</div>
      </div>
      <div className="rounded-lg border-2 border-primary p-4">
        <div className="text-xs uppercase tracking-wide text-primary">Recomendado</div>
        <div className="text-2xl font-bold">{fmtBRL(prices.rec)}</div>
        <div className="text-xs text-muted-foreground">Margem saudável</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Premium</div>
        <div className="text-2xl font-bold">{fmtBRL(prices.prem)}</div>
        <div className="text-xs text-muted-foreground">Serviço diferenciado</div>
      </div>
    </div>
  );
}
