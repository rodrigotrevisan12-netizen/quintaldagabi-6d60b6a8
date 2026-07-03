import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Tags,
  Receipt,
  FlaskConical,
  TrendingUp,
  FileBarChart,
  Wallet,
  Users,
  Calendar,
  Loader2,
  DollarSign,
  Activity,
  Maximize2,
  Building,
  Plus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FIXED_CATEGORIES,
  VARIABLE_CATEGORIES,
  CATEGORY_LABELS,
  classifyCategory,
} from "@/lib/cost-engine";
import { PricingTab } from "@/components/pricing-tab";

export const Route = createFileRoute("/_authenticated/app/inteligencia-financeira")({
  head: () => ({ meta: [{ title: "Inteligência Financeira — Quintal da Gabi" }] }),
  component: InteligenciaFinanceiraPage,
});


/* ------------------------------------------------------------------ */
/*  Formatadores auxiliares                                           */
/* ------------------------------------------------------------------ */

function fmtBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

/* ------------------------------------------------------------------ */
/*  Página principal                                                  */
/* ------------------------------------------------------------------ */

function InteligenciaFinanceiraPage() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // 1. Financeiro (Transações)
  const transactionsQuery = useQuery({
    queryKey: ["inteligencia-financeira-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Funcionários
  const employeesQuery = useQuery({
    queryKey: ["inteligencia-financeira-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Creche (Estadias)
  const daycareStaysQuery = useQuery({
    queryKey: ["inteligencia-financeira-daycare"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daycare_stays")
        .select("*, dog:dogs(name, tutor:tutors(full_name))")
        .order("check_in_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 4. Hospedagem (Estadias)
  const boardingStaysQuery = useQuery({
    queryKey: ["inteligencia-financeira-boarding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_stays")
        .select("*, dog:dogs(name, tutor:tutors(full_name))")
        .order("check_in_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 5. Banho e Tosa (Agendamentos)
  const groomingAppointmentsQuery = useQuery({
    queryKey: ["inteligencia-financeira-grooming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grooming_appointments")
        .select("*, dog:dogs(name, tutor:tutors(full_name))")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 6. Configurações - Pacotes Creche
  const daycarePackagesQuery = useQuery({
    queryKey: ["inteligencia-financeira-daycare-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daycare_packages")
        .select("*")
        .order("days_per_week", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 7. Configurações - Serviços Banho & Tosa
  const groomingServicesQuery = useQuery({
    queryKey: ["inteligencia-financeira-grooming-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grooming_services")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 8. Configurações - Capacidade
  const unitSettingsQuery = useQuery({
    queryKey: ["inteligencia-financeira-unit-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_settings")
        .select("*, unit:units(name)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading =
    transactionsQuery.isLoading ||
    employeesQuery.isLoading ||
    daycareStaysQuery.isLoading ||
    boardingStaysQuery.isLoading ||
    groomingAppointmentsQuery.isLoading ||
    daycarePackagesQuery.isLoading ||
    groomingServicesQuery.isLoading ||
    unitSettingsQuery.isLoading;

  // Separação de receitas e despesas no financeiro
  const transactions = transactionsQuery.data ?? [];
  const incomeTransactions = useMemo(
    () => transactions.filter((t) => (t.kind as string) === "receita" || (t.kind as string) === "revenue"),
    [transactions],
  );
  const expenseTransactions = useMemo(
    () => transactions.filter((t) => (t.kind as string) === "despesa" || (t.kind as string) === "expense"),
    [transactions],
  );

  if (isLoading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando dados integrados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">
          Centro de Inteligência Financeira e Precificação
        </h1>
        <p className="text-muted-foreground">
          Integração em tempo real com todos os módulos do sistema. Os dados são atualizados automaticamente.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="precificacao">
            <Tags className="mr-1.5 h-4 w-4" />
            Precificação
          </TabsTrigger>
          <TabsTrigger value="custos">
            <Receipt className="mr-1.5 h-4 w-4" />
            Custos
          </TabsTrigger>
          <TabsTrigger value="simulacoes">
            <FlaskConical className="mr-1.5 h-4 w-4" />
            Simulações
          </TabsTrigger>
          <TabsTrigger value="indicadores">
            <TrendingUp className="mr-1.5 h-4 w-4" />
            Indicadores
          </TabsTrigger>
          <TabsTrigger value="relatorios">
            <FileBarChart className="mr-1.5 h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* ================================================================== */}
        {/*  1. DASHBOARD                                                      */}
        {/* ================================================================== */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Transações Financeiras
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {incomeTransactions.length} receitas e {expenseTransactions.length} despesas integradas.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quadro de Funcionários
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employeesQuery.data?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Colaboradores cadastrados na folha de pagamento.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Hospedagens & Creches
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(daycareStaysQuery.data?.length ?? 0) + (boardingStaysQuery.data?.length ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {daycareStaysQuery.data?.length ?? 0} estadias de creche e{" "}
                  {boardingStaysQuery.data?.length ?? 0} de hospedagem integradas.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Serviços Realizados
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {groomingAppointmentsQuery.data?.length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Agendamentos de banho e tosa vinculados.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dados de Operação Integrados</CardTitle>
                <CardDescription>
                  Fontes de dados alimentando o Centro de Inteligência
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Módulo Financeiro</span>
                  </div>
                  <Badge variant="outline">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Módulo de Creche & Hospedagem</span>
                  </div>
                  <Badge variant="outline">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Módulo de Banho & Tosa</span>
                  </div>
                  <Badge variant="outline">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Módulo de Funcionários</span>
                  </div>
                  <Badge variant="outline">Conectado</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Unidade & Capacidades</CardTitle>
                <CardDescription>
                  Parâmetros de ocupação máxima definidos nas configurações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Capacidade Creche</TableHead>
                      <TableHead>Capacidade Hospedagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(unitSettingsQuery.data ?? []).map((setting: any) => (
                      <TableRow key={setting.unit_id}>
                        <TableCell className="font-medium">
                          {setting.unit?.name ?? "Principal"}
                        </TableCell>
                        <TableCell>{setting.daycare_capacity ?? 0} cães</TableCell>
                        <TableCell>{setting.boarding_capacity ?? 0} cães</TableCell>
                      </TableRow>
                    ))}
                    {(unitSettingsQuery.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nenhuma unidade configurada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================== */}
        {/*  2. PRECIFICAÇÃO                                                   */}
        {/* ================================================================== */}
        <TabsContent value="precificacao" className="space-y-6">
          <PricingTab
            employees={employeesQuery.data ?? []}
            expenses={expenseTransactions}
            unitSettings={unitSettingsQuery.data ?? []}
          />
        </TabsContent>


        {/* ================================================================== */}
        {/*  3. CUSTOS                                                         */}
        {/* ================================================================== */}
        <TabsContent value="custos" className="space-y-6">
          <CostEngine
            employees={employeesQuery.data ?? []}
            expenses={expenseTransactions}
            unitSettings={unitSettingsQuery.data ?? []}
          />
        </TabsContent>


        {/* ================================================================== */}
        {/*  4. SIMULAÇÕES                                                     */}
        {/* ================================================================== */}
        <TabsContent value="simulacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Base de Dados de Entrada para Simulações</CardTitle>
              <CardDescription>
                Dados em tempo real prontos para alimentar futuros cenários hipotéticos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Custo Pessoal Real</span>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    {fmtBRL(
                      (employeesQuery.data ?? [])
                        .filter((e: any) => e.active)
                        .reduce((acc: number, cur: any) => acc + (Number(cur.salary) || 0), 0)
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Soma de todos os salários de funcionários ativos.
                  </p>
                </div>

                <div className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Capacidade Creche</span>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    {(unitSettingsQuery.data ?? []).reduce(
                      (acc: number, cur: any) => acc + (cur.daycare_capacity ?? 0),
                      0
                    )}{" "}
                    vagas
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Soma de capacidades de creche registradas.
                  </p>
                </div>

                <div className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Capacidade Hospedagem</span>
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    {(unitSettingsQuery.data ?? []).reduce(
                      (acc: number, cur: any) => acc + (cur.boarding_capacity ?? 0),
                      0
                    )}{" "}
                    vagas
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Soma de capacidades de hospedagem registradas.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-dashed p-6 text-center">
                <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <h4 className="font-semibold mb-1">Área Pronta para Regras de Simulação</h4>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  A estrutura da página já consome as capacidades e os salários. A próxima etapa irá introduzir a modelagem matemática para simulações de reajustes, projeção de folha de pagamento e alteração de margens de lucro.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================== */}
        {/*  5. INDICADORES                                                    */}
        {/* ================================================================== */}
        <TabsContent value="indicadores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas Operacionais & de Ocupação</CardTitle>
              <CardDescription>
                Indicadores derivados das tabelas de estadias e cadastros ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border p-4 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Estadias de Creche</span>
                  <div className="text-2xl font-bold">{daycareStaysQuery.data?.length ?? 0}</div>
                  <span className="text-xs text-muted-foreground">Estadias registradas na base de dados.</span>
                </div>

                <div className="rounded-xl border p-4 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Estadias de Hospedagem</span>
                  <div className="text-2xl font-bold">{boardingStaysQuery.data?.length ?? 0}</div>
                  <span className="text-xs text-muted-foreground">Diárias e pernoites registradas na base de dados.</span>
                </div>

                <div className="rounded-xl border p-4 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Agendamentos Banho & Tosa</span>
                  <div className="text-2xl font-bold">{groomingAppointmentsQuery.data?.length ?? 0}</div>
                  <span className="text-xs text-muted-foreground">Serviços solicitados e agendados no calendário.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================== */}
        {/*  6. RELATÓRIOS                                                     */}
        {/* ================================================================== */}
        <TabsContent value="relatorios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consolidação de Receitas</CardTitle>
              <CardDescription>
                Todas as receitas do módulo Financeiro que alimentam a análise de faturamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data de Entrada</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.description}</TableCell>
                      <TableCell className="capitalize">
                        {tx.revenue_category || tx.revenueCategory || "Outros"}
                      </TableCell>
                      <TableCell>{fmtDate(tx.paid_at || tx.paidAt || tx.created_at)}</TableCell>
                      <TableCell className="text-green-600 font-medium">+{fmtBRL(tx.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {incomeTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhuma receita registrada no módulo Financeiro.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Motor de Custos                                                   */
/* ------------------------------------------------------------------ */

const WORKING_HOURS_PER_DAY = 12;
const DAYS_PER_MONTH = 30;

function CostEngine({
  employees,
  expenses,
  unitSettings,
}: {
  employees: any[];
  expenses: any[];
  unitSettings: any[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "aluguel",
    due_date: new Date().toISOString().slice(0, 10),
  });

  const activeEmployees = employees.filter((e) => e.active);
  const salariesTotal = activeEmployees.reduce(
    (a, e) => a + (Number(e.salary) || 0),
    0,
  );

  // Custos por categoria (mês corrente, baseando-se em due_date ou created_at)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthExpenses = expenses.filter((tx) => {
    const d = new Date(tx.due_date || tx.created_at);
    return d >= monthStart && d < monthEnd;
  });

  const byCategory = new Map<string, number>();
  for (const tx of monthExpenses) {
    const cat = (tx.expense_category || "outros") as string;
    // Salários lançados manualmente entram aqui; salários dos funcionários abaixo
    if (cat === "salarios") continue;
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(tx.amount || 0));
  }

  const fixedFromExpenses = FIXED_CATEGORIES.filter((c) => c !== "salarios")
    .map((c) => ({ category: c, total: byCategory.get(c) ?? 0 }));
  const variableFromExpenses = VARIABLE_CATEGORIES
    .map((c) => ({ category: c, total: byCategory.get(c) ?? 0 }));

  const fixedTotal =
    salariesTotal + fixedFromExpenses.reduce((a, x) => a + x.total, 0);
  const variableTotal = variableFromExpenses.reduce((a, x) => a + x.total, 0);
  const operationalTotal = fixedTotal + variableTotal;
  const dailyCost = operationalTotal / DAYS_PER_MONTH;
  const hourlyCost = dailyCost / WORKING_HOURS_PER_DAY;
  const perEmployee = activeEmployees.length
    ? operationalTotal / activeEmployees.length
    : 0;

  const createExpense = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount.replace(",", "."));
      if (!amount || amount <= 0) throw new Error("Informe um valor válido");
      if (!form.description.trim()) throw new Error("Informe a descrição");
      const { error } = await supabase.from("financial_transactions").insert({
        kind: "despesa",
        expense_category: form.category as any,
        description: form.description.trim(),
        amount,
        due_date: form.due_date,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Despesa registrada no Financeiro");
      setOpen(false);
      setForm({
        description: "",
        amount: "",
        category: "aluguel",
        due_date: new Date().toISOString().slice(0, 10),
      });
      qc.invalidateQueries({ queryKey: ["inteligencia-financeira-transactions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar despesa"),
  });

  return (
    <div className="space-y-6">
      {/* Cards de totais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Custo Fixo Mensal" value={fmtBRL(fixedTotal)} hint="Salários + custos fixos do mês" />
        <MetricCard label="Custo Variável Mensal" value={fmtBRL(variableTotal)} hint="Insumos e demais custos variáveis" />
        <MetricCard label="Custo Operacional Total" value={fmtBRL(operationalTotal)} hint="Fixo + Variável no mês" highlight />
        <MetricCard label="Custo Diário" value={fmtBRL(dailyCost)} hint={`Base de ${DAYS_PER_MONTH} dias`} />
        <MetricCard label="Custo por Hora" value={fmtBRL(hourlyCost)} hint={`Base de ${WORKING_HOURS_PER_DAY}h/dia`} />
        <MetricCard label="Custo Médio por Funcionário" value={fmtBRL(perEmployee)} hint={`${activeEmployees.length} ativos`} />
      </div>

      {/* Cadastro rápido */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" />Nova despesa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex.: Aluguel — Nov/25"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__fixed__" disabled>— Custos fixos —</SelectItem>
                    {FIXED_CATEGORIES.filter((c) => c !== "salarios").map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                    <SelectItem value="__var__" disabled>— Custos variáveis —</SelectItem>
                    {VARIABLE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createExpense.mutate()}
                disabled={createExpense.isPending}
              >
                {createExpense.isPending ? "Salvando…" : "Salvar no Financeiro"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detalhamento */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Custos Fixos</CardTitle>
            <CardDescription>Compromissos recorrentes do mês corrente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Salários (folha ativa)</TableCell>
                  <TableCell className="text-right">{fmtBRL(salariesTotal)}</TableCell>
                </TableRow>
                {fixedFromExpenses.map((r) => (
                  <TableRow key={r.category}>
                    <TableCell>{CATEGORY_LABELS[r.category]}</TableCell>
                    <TableCell className="text-right">{fmtBRL(r.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">Total fixo</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRL(fixedTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custos Variáveis</CardTitle>
            <CardDescription>Insumos consumidos conforme a operação</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variableFromExpenses.map((r) => (
                  <TableRow key={r.category}>
                    <TableCell>{CATEGORY_LABELS[r.category]}</TableCell>
                    <TableCell className="text-right">{fmtBRL(r.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">Total variável</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRL(variableTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Folha detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Folha de Pagamento</CardTitle>
          <CardDescription>Puxada automaticamente do módulo Funcionários</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Salário</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.fullName || emp.full_name}</TableCell>
                  <TableCell className="capitalize">{emp.jobRole || emp.job_role}</TableCell>
                  <TableCell className="text-right">{fmtBRL(emp.salary)}</TableCell>
                  <TableCell>
                    <Badge variant={emp.active ? "default" : "secondary"}>
                      {emp.active ? "Ativo" : "Desligado"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum funcionário cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Todas despesas do mês */}
      <Card>
        <CardHeader>
          <CardTitle>Despesas do mês (Financeiro)</CardTitle>
          <CardDescription>
            {monthExpenses.length} lançamentos · alterações no Financeiro atualizam esta tela automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthExpenses.map((tx) => {
                const cat = (tx.expense_category || "outros") as string;
                const grupo = classifyCategory(cat);
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell>{CATEGORY_LABELS[cat] ?? cat}</TableCell>
                    <TableCell>
                      <Badge variant={grupo === "fixo" ? "default" : "secondary"}>
                        {grupo === "fixo" ? "Fixo" : "Variável"}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmtDate(tx.due_date || tx.created_at)}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">-{fmtBRL(tx.amount)}</TableCell>
                  </TableRow>
                );
              })}
              {monthExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma despesa no mês corrente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

