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
          <Card>
            <CardHeader>
              <CardTitle>Valores de Pacotes de Creche</CardTitle>
              <CardDescription>
                Tabela de preços de pacotes mensais atualmente cadastrados no módulo Configurações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Pacote</TableHead>
                    <TableHead>Dias por Semana</TableHead>
                    <TableHead>Preço Mensal</TableHead>
                    <TableHead>Preço Dia Extra</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(daycarePackagesQuery.data ?? []).map((pkg: any) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>{pkg.days_per_week} dias</TableCell>
                      <TableCell>{fmtBRL(pkg.monthly_price)}</TableCell>
                      <TableCell>{fmtBRL(pkg.extra_day_price)}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.is_active ? "default" : "secondary"}>
                          {pkg.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(daycarePackagesQuery.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum pacote de creche cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Serviços de Banho & Tosa</CardTitle>
              <CardDescription>
                Serviços e preços base integrados do módulo de Banho e Tosa / Configurações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Duração Estimada</TableHead>
                    <TableHead>Preço Base</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(groomingServicesQuery.data ?? []).map((service: any) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.duration_min} min</TableCell>
                      <TableCell>{fmtBRL(service.base_price)}</TableCell>
                      <TableCell>
                        <Badge variant={service.is_active ? "default" : "secondary"}>
                          {service.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(groomingServicesQuery.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum serviço de banho & tosa cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================== */}
        {/*  3. CUSTOS                                                         */}
        {/* ================================================================== */}
        <TabsContent value="custos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Folha de Pagamento (Custos de Pessoal)</CardTitle>
              <CardDescription>
                Funcionários ativos e salários base carregados diretamente do módulo Funcionários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead>Cargo / Função</TableHead>
                    <TableHead>Salário Base</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(employeesQuery.data ?? []).map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.fullName || emp.full_name}</TableCell>
                      <TableCell className="capitalize">{emp.jobRole || emp.job_role}</TableCell>
                      <TableCell>{fmtBRL(emp.salary)}</TableCell>
                      <TableCell>
                        <Badge variant={emp.active ? "default" : "secondary"}>
                          {emp.active ? "Ativo" : "Desligado"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(employeesQuery.data ?? []).length === 0 && (
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

          <Card>
            <CardHeader>
              <CardTitle>Despesas e Custos Gerais</CardTitle>
              <CardDescription>
                Despesas registradas integradas em tempo real do módulo Financeiro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.description}</TableCell>
                      <TableCell className="capitalize">
                        {tx.expense_category || tx.expenseCategory || "Outros"}
                      </TableCell>
                      <TableCell>{fmtDate(tx.due_date || tx.dueDate)}</TableCell>
                      <TableCell className="text-red-600 font-medium">-{fmtBRL(tx.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenseTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhuma despesa registrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
