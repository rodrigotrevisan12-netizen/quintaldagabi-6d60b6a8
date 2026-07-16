import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Info, AlertTriangle, Loader2 } from "lucide-react";
import { FIXED_CATEGORIES, VARIABLE_CATEGORIES } from "@/lib/cost-engine";
import { supabase } from "@/integrations/supabase/client";

const DAYS_PER_MONTH = 30;
const WORKING_HOURS_PER_DAY = 12;
const MAX_WINDOW_DAYS = 90; // teto da janela de análise
const MIN_WINDOW_DAYS = 7; // mínimo de dados reais pra confiar neles em vez de estimativa manual

type TaxRegime = "simples" | "presumido" | "real";

type PricingSettings = {
  minMarginPct: number;
  recommendedPct: number;
  premiumPct: number;
  taxRegime: TaxRegime;
  payrollBurdenOverride: number | null; // ajuste manual opcional; null = calcula automático pelo regime
  boardingWeight: number;
  manualDaycareAvg: number | null;
  manualBoardingAvg: number | null;
  manualGroomingAvg: number | null;
};

const DEFAULT_SETTINGS: PricingSettings = {
  minMarginPct: 20,
  recommendedPct: 40,
  premiumPct: 70,
  taxRegime: "simples",
  payrollBurdenOverride: null,
  boardingWeight: 2,
  manualDaycareAvg: null,
  manualBoardingAvg: null,
  manualGroomingAvg: null,
};

// ---- Cálculo transparente dos encargos trabalhistas (CLT), por componente ----
// Valores aproximados e comuns no Brasil — confirme com a contabilidade da
// empresa antes de usar para decisões grandes de preço; alíquotas específicas
// podem variar por atividade (CNAE) e convenção coletiva.
function payrollBurdenBreakdown(regime: TaxRegime) {
  const decimoTerceiro = 100 / 12;
  const ferias = (100 / 12) * (4 / 3);
  const fgts = 8;
  const fgtsSobreExtras = 0.08 * (decimoTerceiro + ferias);
  const multaFgts = 0.4 * (fgts + fgtsSobreExtras);

  const items = [
    { label: "13º salário (1/12 avos)", pct: decimoTerceiro },
    { label: "Férias + 1/3 constitucional (1/12 avos)", pct: ferias },
    { label: "FGTS (8%)", pct: fgts },
    { label: "FGTS sobre 13º e férias", pct: fgtsSobreExtras },
    { label: "Provisão multa rescisória FGTS (40%)", pct: multaFgts },
  ];

  if (regime !== "simples") {
    items.push({ label: "INSS patronal (20%)", pct: 20 });
    items.push({ label: "RAT — Risco Ambiental do Trabalho (~2%)", pct: 2 });
    items.push({ label: "Sistema S (SESC/SENAC/SEBRAE/INCRA...)", pct: 5.8 });
  }

  const total = items.reduce((a, i) => a + i.pct, 0);
  return { items, total };
}

function fmtBRL(v: number) {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PricingTab({
  employees,
  expenses,
  unitSettings,
  daycareStays = [],
  boardingStays = [],
  groomingAppointments = [],
}: {
  employees: any[];
  expenses: any[];
  unitSettings: any[];
  daycareStays?: any[];
  boardingStays?: any[];
  groomingAppointments?: any[];
}) {
  const qc = useQueryClient();

  // ---- Configurações agora vêm do banco (por empresa), não do localStorage ----
  const settingsQuery = useQuery({
    queryKey: ["pricing-settings"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user?.id ?? "")
        .maybeSingle();
      const companyId = (profile as { company_id?: string | null } | null)?.company_id;
      if (!companyId) return { companyId: null, settings: DEFAULT_SETTINGS };

      const { data, error } = await (supabase as any)
        .from("companies")
        .select(
          "pricing_min_margin_pct, pricing_recommended_margin_pct, pricing_premium_margin_pct, pricing_payroll_burden_pct, pricing_boarding_weight, pricing_manual_daycare_avg, pricing_manual_boarding_avg, pricing_manual_grooming_avg, tax_regime",
        )
        .eq("id", companyId)
        .maybeSingle();
      if (error) throw error;

      return {
        companyId,
        settings: {
          minMarginPct: Number(data?.pricing_min_margin_pct ?? DEFAULT_SETTINGS.minMarginPct),
          recommendedPct: Number(data?.pricing_recommended_margin_pct ?? DEFAULT_SETTINGS.recommendedPct),
          premiumPct: Number(data?.pricing_premium_margin_pct ?? DEFAULT_SETTINGS.premiumPct),
          taxRegime: (data?.tax_regime as TaxRegime) ?? DEFAULT_SETTINGS.taxRegime,
          payrollBurdenOverride: data?.pricing_payroll_burden_pct != null ? Number(data.pricing_payroll_burden_pct) : null,
          boardingWeight: Number(data?.pricing_boarding_weight ?? DEFAULT_SETTINGS.boardingWeight),
          manualDaycareAvg: data?.pricing_manual_daycare_avg != null ? Number(data.pricing_manual_daycare_avg) : null,
          manualBoardingAvg: data?.pricing_manual_boarding_avg != null ? Number(data.pricing_manual_boarding_avg) : null,
          manualGroomingAvg: data?.pricing_manual_grooming_avg != null ? Number(data.pricing_manual_grooming_avg) : null,
        } as PricingSettings,
      };
    },
  });

  const [draft, setDraft] = useState<PricingSettings | null>(null);
  const settings = draft ?? settingsQuery.data?.settings ?? DEFAULT_SETTINGS;

  const save = useMutation({
    mutationFn: async (next: PricingSettings) => {
      const companyId = settingsQuery.data?.companyId;
      if (!companyId) throw new Error("Empresa não encontrada");
      const { error } = await (supabase as any)
        .from("companies")
        .update({
          pricing_min_margin_pct: next.minMarginPct,
          pricing_recommended_margin_pct: next.recommendedPct,
          pricing_premium_margin_pct: next.premiumPct,
          pricing_payroll_burden_pct: next.payrollBurdenOverride,
          pricing_boarding_weight: next.boardingWeight,
          pricing_manual_daycare_avg: next.manualDaycareAvg,
          pricing_manual_boarding_avg: next.manualBoardingAvg,
          pricing_manual_grooming_avg: next.manualGroomingAvg,
          tax_regime: next.taxRegime,
        })
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações de precificação salvas");
      qc.invalidateQueries({ queryKey: ["pricing-settings"] });
      setDraft(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function updateDraft(patch: Partial<PricingSettings>) {
    setDraft({ ...settings, ...patch });
  }

  // ---- Custos: média móvel de 90 dias + encargos trabalhistas sobre salário ----
  const costs = useMemo(() => {
    const activeEmployees = employees.filter((e) => e.active);
    const cltSalaries = activeEmployees
      .filter((e) => (e.contract_type ?? "clt") === "clt")
      .reduce((a, e) => a + (Number(e.salary) || 0), 0);
    const pjSalaries = activeEmployees
      .filter((e) => e.contract_type === "pj")
      .reduce((a, e) => a + (Number(e.salary) || 0), 0);
    // PJ/autônomo geralmente já fatura o valor combinado "cheio" — sem os
    // encargos de CLT (FGTS, INSS patronal, 13º, férias) somados por cima.
    const burden = payrollBurdenBreakdown(settings.taxRegime);
    const effectiveBurdenPct = settings.payrollBurdenOverride ?? burden.total;
    const salariesTotal = cltSalaries * (1 + effectiveBurdenPct / 100) + pjSalaries;

    // ---- Janela de análise: usa até 90 dias, mas não exige o período
    // completo — assim que houver alguns dias de movimento real, já usa
    // esse dado real em vez de esperar 90 dias. Sem NENHUM registro ainda,
    // cai pra estimativa manual (configurada abaixo) ou capacidade máxima.
    const allDates = [
      ...daycareStays.map((s: any) => new Date(s.check_in_at)),
      ...boardingStays.map((s: any) => new Date(s.check_in_at)),
      ...groomingAppointments.map((g: any) => new Date(g.scheduled_at ?? g.created_at)),
    ].filter((d) => !isNaN(d.getTime()));
    const earliest = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : null;
    const daysSinceEarliest = earliest ? Math.ceil((Date.now() - earliest.getTime()) / 86400000) : 0;
    const windowDays = Math.min(MAX_WINDOW_DAYS, Math.max(daysSinceEarliest, 1));
    const hasEnoughRealData = daysSinceEarliest >= MIN_WINDOW_DAYS;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_WINDOW_DAYS); // despesas: sempre olha até 90 dias pra trás
    const recentExpenses = expenses.filter((tx: any) => new Date(tx.due_date || tx.created_at) >= cutoff);

    const byCategory = new Map<string, number>();
    for (const tx of recentExpenses) {
      const cat = (tx.expense_category || "outros") as string;
      if (cat === "salarios") continue; // salário já vem de employees, com encargos aplicados acima
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(tx.amount || 0));
    }
    const monthsInWindow = MAX_WINDOW_DAYS / DAYS_PER_MONTH;
    const fixedFromExpenses =
      FIXED_CATEGORIES.filter((c) => c !== "salarios").reduce((a, c) => a + (byCategory.get(c) ?? 0), 0) /
      monthsInWindow;
    const variableTotal =
      VARIABLE_CATEGORIES.reduce((a, c) => a + (byCategory.get(c) ?? 0), 0) / monthsInWindow;

    const fixedTotal = salariesTotal + fixedFromExpenses;
    const operationalTotal = fixedTotal + variableTotal;
    const dailyCost = operationalTotal / DAYS_PER_MONTH;
    const hourlyCost = dailyCost / WORKING_HOURS_PER_DAY;

    const daycareCapacity = unitSettings.reduce((a, s: any) => a + (s.daycare_capacity ?? 0), 0);
    const boardingCapacity = unitSettings.reduce((a, s: any) => a + (s.boarding_capacity ?? 0), 0);

    // ---- Ocupação REAL média (janela adaptativa acima), não a capacidade máxima ----
    const windowCutoff = new Date();
    windowCutoff.setDate(windowCutoff.getDate() - windowDays);

    const daycareStaysRecent = daycareStays.filter((s: any) => new Date(s.check_in_at) >= windowCutoff);
    const avgDaycarePerDay = hasEnoughRealData ? daycareStaysRecent.length / windowDays : (settings.manualDaycareAvg ?? 0);

    const boardingNightsInWindow = boardingStays.reduce((sum: number, s: any) => {
      const start = new Date(Math.max(new Date(s.check_in_at).getTime(), windowCutoff.getTime()));
      const end = s.check_out_at ? new Date(s.check_out_at) : new Date();
      const nights = Math.max(0, (end.getTime() - start.getTime()) / 86400000);
      return sum + nights;
    }, 0);
    const avgBoardingPerDay = hasEnoughRealData ? boardingNightsInWindow / windowDays : (settings.manualBoardingAvg ?? 0);

    const groomingRecent = groomingAppointments.filter((g: any) => new Date(g.scheduled_at ?? g.created_at) >= windowCutoff);
    const avgGroomingPerDay = hasEnoughRealData ? groomingRecent.length / windowDays : (settings.manualGroomingAvg ?? 0);

    const usingManualEstimate =
      !hasEnoughRealData && (settings.manualDaycareAvg != null || settings.manualBoardingAvg != null || settings.manualGroomingAvg != null);

    return {
      operationalTotal,
      fixedTotal,
      variableTotal,
      dailyCost,
      hourlyCost,
      daycareCapacity,
      boardingCapacity,
      activeEmployees: activeEmployees.length,
      avgDaycarePerDay,
      avgBoardingPerDay,
      avgGroomingPerDay,
      windowDays,
      hasEnoughRealData,
      usingManualEstimate,
      hasOccupancyData: hasEnoughRealData || usingManualEstimate,
      effectiveBurdenPct,
      burdenBreakdown: burden.items,
    };
  }, [
    employees, expenses, unitSettings, daycareStays, boardingStays, groomingAppointments,
    settings.taxRegime, settings.payrollBurdenOverride, settings.manualDaycareAvg, settings.manualBoardingAvg, settings.manualGroomingAvg,
  ]);

  // ---- Rateio único: creche + hospedagem + banho&tosa dividem o MESMO
  // custo diário uma vez só (sem dupla contagem), proporcional ao uso real. ----
  const groomingHoursBySize: Record<string, number> = { Pequeno: 0.75, Médio: 1.0, Grande: 1.5 };
  const avgGroomingHours = 1; // usado só para ponderar a fatia do banho&tosa no rateio geral

  const usingRealOccupancy = costs.hasOccupancyData;
  const daycareUnits = usingRealOccupancy ? costs.avgDaycarePerDay : costs.daycareCapacity;
  const boardingUnits = usingRealOccupancy ? costs.avgBoardingPerDay : costs.boardingCapacity;
  const groomingUnits = usingRealOccupancy ? costs.avgGroomingPerDay : 0;

  const totalWeightedUnits =
    daycareUnits + boardingUnits * settings.boardingWeight + groomingUnits * (avgGroomingHours / WORKING_HOURS_PER_DAY);

  const costPerUnit = totalWeightedUnits > 0 ? costs.dailyCost / totalWeightedUnits : 0;

  const daycareBaseCost = costPerUnit;
  const boardingBaseCost = costPerUnit * settings.boardingWeight;

  const grooming = Object.entries(groomingHoursBySize).map(([size, hours]) => ({
    size,
    hours,
    baseCost: costPerUnit * (hours / WORKING_HOURS_PER_DAY),
  }));

  const applyMarkup = (cost: number, pct: number) => cost * (1 + pct / 100);
  const priceRow = (cost: number) => ({
    min: applyMarkup(cost, settings.minMarginPct),
    rec: applyMarkup(cost, settings.recommendedPct),
    prem: applyMarkup(cost, settings.premiumPct),
  });

  const daycarePrices = priceRow(daycareBaseCost);
  const boardingPrices = priceRow(boardingBaseCost);

  if (settingsQuery.isLoading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="space-y-6">
      {costs.hasEnoughRealData ? (
        <Card className="border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-muted-foreground">
              Usando <strong>{costs.windowDays} dias</strong> de movimento real registrado (check-ins de
              creche/hospedagem e agendamentos de banho & tosa).
            </p>
          </CardContent>
        </Card>
      ) : costs.usingManualEstimate ? (
        <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-muted-foreground">
              Ainda sem pelo menos {MIN_WINDOW_DAYS} dias de movimento registrado — usando a{" "}
              <strong>estimativa manual</strong> que você preencheu abaixo. Assim que houver dados
              reais suficientes, o cálculo troca sozinho para eles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium">Ainda sem dado nenhum de movimento</p>
              <p className="text-muted-foreground">
                Sem check-ins registrados e sem estimativa manual preenchida, os preços abaixo usam a{" "}
                <strong>capacidade máxima cadastrada</strong> — o que costuma subestimar bastante o
                custo real, já que a casa raramente fica 100% cheia todos os dias. Preencha a
                estimativa manual abaixo pra já ter um número mais realista hoje mesmo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ Estimativa manual (enquanto não há dados reais) ============ */}
      <Card>
        <CardHeader>
          <CardTitle>Estimativa manual de movimento</CardTitle>
          <CardDescription>
            Preencha só se ainda não tiver pelo menos {MIN_WINDOW_DAYS} dias de uso registrado no sistema —
            é usada como base de cálculo enquanto isso, e ignorada automaticamente assim que houver
            dados reais suficientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Cães/dia na creche (média)</Label>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={settings.manualDaycareAvg ?? ""}
              placeholder="Ex.: 8"
              onChange={(e) => updateDraft({ manualDaycareAvg: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Cães/dia em hospedagem (média)</Label>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={settings.manualBoardingAvg ?? ""}
              placeholder="Ex.: 3"
              onChange={(e) => updateDraft({ manualBoardingAvg: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Atendimentos/dia de banho & tosa (média)</Label>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={settings.manualGroomingAvg ?? ""}
              placeholder="Ex.: 5"
              onChange={(e) => updateDraft({ manualGroomingAvg: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ============ Configurações ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configurações de Precificação
          </CardTitle>
          <CardDescription>
            Válido para toda a empresa (todos os dispositivos). Alterações recalculam os preços automaticamente.
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
                onChange={(e) => updateDraft({ minMarginPct: Number(e.target.value) || 0 })}
              />
              <p className="mt-1 text-xs text-muted-foreground">Preço mínimo = custo × (1 + margem mínima)</p>
            </div>
            <div>
              <Label>Preço recomendado (%)</Label>
              <Input
                type="number"
                min={0}
                value={settings.recommendedPct}
                onChange={(e) => updateDraft({ recommendedPct: Number(e.target.value) || 0 })}
              />
              <p className="mt-1 text-xs text-muted-foreground">Markup ideal com margem saudável.</p>
            </div>
            <div>
              <Label>Preço premium (%)</Label>
              <Input
                type="number"
                min={0}
                value={settings.premiumPct}
                onChange={(e) => updateDraft({ premiumPct: Number(e.target.value) || 0 })}
              />
              <p className="mt-1 text-xs text-muted-foreground">Para clientes que valorizam serviço diferenciado.</p>
            </div>
            <div>
              <Label>Regime tributário</Label>
              <Select value={settings.taxRegime} onValueChange={(v: TaxRegime) => updateDraft({ taxRegime: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Simples Nacional</SelectItem>
                  <SelectItem value="presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Define os encargos calculados automaticamente sobre salários CLT — veja o detalhamento abaixo.
              </p>
            </div>
            <div>
              <Label>Peso da hospedagem</Label>
              <Input
                type="number"
                min={1}
                step="0.1"
                value={settings.boardingWeight}
                onChange={(e) => updateDraft({ boardingWeight: Number(e.target.value) || 1 })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Quantas "vagas de creche" uma vaga de hospedagem consome de estrutura/equipe.
              </p>
            </div>
          </div>

          <details className="mt-4 rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              Como chegamos em {costs.effectiveBurdenPct.toFixed(1)}% de encargos sobre CLT?
            </summary>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              {costs.burdenBreakdown.map((item) => (
                <li key={item.label} className="flex justify-between gap-4">
                  <span>{item.label}</span>
                  <span>{item.pct.toFixed(2)}%</span>
                </li>
              ))}
              <li className="flex justify-between gap-4 border-t pt-1 font-medium text-foreground">
                <span>Total</span>
                <span>{(costs.burdenBreakdown.reduce((a, i) => a + i.pct, 0)).toFixed(1)}%</span>
              </li>
            </ul>
            <p className="mt-2 text-xs">
              Estimativa com base nas regras gerais da CLT — alíquotas podem variar por atividade (CNAE) e
              convenção coletiva. Confirme com a contabilidade da empresa antes de decisões de preço importantes.
            </p>
            <div className="mt-3">
              <Label className="text-xs">Ajuste manual (opcional)</Label>
              <Input
                type="number"
                min={0}
                placeholder={`Deixe em branco para usar ${payrollBurdenBreakdown(settings.taxRegime).total.toFixed(1)}% automático`}
                value={settings.payrollBurdenOverride ?? ""}
                onChange={(e) =>
                  updateDraft({ payrollBurdenOverride: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Preencha só se quiser sobrepor o cálculo automático (ex.: convenção coletiva com regras diferentes).
              </p>
            </div>
          </details>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDraft(DEFAULT_SETTINGS)}>
              Restaurar padrão
            </Button>
            <Button onClick={() => save.mutate(settings)} disabled={!draft || save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
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
            Custos: média dos últimos 90 dias, com encargos sobre salário já incluídos. Ocupação: uso
            real registrado (não a capacidade máxima), quando disponível.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 text-sm">
            <Metric label="Custo operacional / mês" value={fmtBRL(costs.operationalTotal)} />
            <Metric label="Custo diário" value={fmtBRL(costs.dailyCost)} />
            <Metric label="Custo por hora" value={fmtBRL(costs.hourlyCost)} />
            <Metric
              label="Ocupação média — creche"
              value={
                costs.hasEnoughRealData
                  ? `${costs.avgDaycarePerDay.toFixed(1)} cães/dia (real)`
                  : costs.usingManualEstimate
                    ? `${costs.avgDaycarePerDay.toFixed(1)} cães/dia (estimado)`
                    : `${costs.daycareCapacity} vagas (máx.)`
              }
            />
            <Metric
              label="Ocupação média — hospedagem"
              value={
                costs.hasEnoughRealData
                  ? `${costs.avgBoardingPerDay.toFixed(1)} cães/dia (real)`
                  : costs.usingManualEstimate
                    ? `${costs.avgBoardingPerDay.toFixed(1)} cães/dia (estimado)`
                    : `${costs.boardingCapacity} vagas (máx.)`
              }
            />
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
          totalWeightedUnits === 0
            ? "Cadastre a capacidade de creche em Configurações, ou registre check-ins, para calcular."
            : `Custo diário total (${fmtBRL(costs.dailyCost)}) dividido entre creche, hospedagem e banho & tosa proporcionalmente ao uso real de cada um — sem contar o mesmo custo duas vezes. Resulta em ${fmtBRL(daycareBaseCost)} de custo por cão/dia. Aplicando as margens definidas, chegamos aos preços sugeridos.`
        }
      />

      {/* ============ Hospedagem ============ */}
      <PricingServiceCard
        title="Hospedagem (diária)"
        baseCost={boardingBaseCost}
        prices={boardingPrices}
        explanation={
          totalWeightedUnits === 0
            ? "Cadastre a capacidade de hospedagem em Configurações, ou registre estadias, para calcular."
            : `Hospedagem recebe peso ${settings.boardingWeight}× no rateio (mais estrutura, alimentação, acompanhamento noturno). Custo por cão/dia: ${fmtBRL(boardingBaseCost)}, sobre o qual aplicamos as margens.`
        }
      />

      {/* ============ Banho e Tosa ============ */}
      <Card>
        <CardHeader>
          <CardTitle>Banho e Tosa — por porte</CardTitle>
          <CardDescription>
            Fatia do mesmo custo diário rateado (não soma por cima do que já foi cobrado da creche/hospedagem).
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
            Explicação: cada porte recebe uma fatia do custo diário proporcional ao tempo de atendimento,
            dentro do mesmo rateio usado para creche e hospedagem — evitando cobrar o custo fixo da empresa
            mais de uma vez.
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
