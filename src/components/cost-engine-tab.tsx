import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FIXED_CATEGORIES, VARIABLE_CATEGORIES, CATEGORY_LABELS, classifyCategory } from "@/lib/cost-engine";

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
/*  Motor de Custos — reutilizável (usado dentro de Financeiro)       */
/* ------------------------------------------------------------------ */

const WORKING_HOURS_PER_DAY = 12;
const DAYS_PER_MONTH = 30;

export function CostEngine({
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
  const [toDelete, setToDelete] = useState<any | null>(null);
  const { data: me } = useCurrentUser();
  const isAdmin = me?.primaryRole === "admin";
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

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Despesa excluída");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["inteligencia-financeira-transactions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir despesa"),
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
                {isAdmin && <TableHead className="w-10" />}
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
                    {isAdmin && (
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => setToDelete(tx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {monthExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma despesa no mês corrente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.description ? `"${toDelete.description}" — ${fmtBRL(Number(toDelete?.amount || 0))}. ` : ""}
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && deleteExpense.mutate(toDelete.id)}>
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
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

