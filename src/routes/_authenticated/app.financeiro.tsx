import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, Receipt as ReceiptIcon, Printer, Trash2, CheckCircle2 } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Quintal da Gabi" }] }),
  component: FinanceiroPage,
});

const REVENUE_CATS = [
  { value: "creche", label: "Creche" },
  { value: "hospedagem", label: "Hospedagem" },
  { value: "banho_tosa", label: "Banho e tosa" },
  { value: "outros_servicos", label: "Outros serviços" },
] as const;

const EXPENSE_CATS = [
  { value: "salarios", label: "Salários" },
  { value: "produtos", label: "Produtos" },
  { value: "aluguel", label: "Aluguel" },
  { value: "agua", label: "Água" },
  { value: "energia", label: "Energia" },
  { value: "veterinario", label: "Veterinário" },
  { value: "outros", label: "Outros" },
] as const;

type Tx = {
  id: string;
  kind: "receita" | "despesa";
  revenue_category: string | null;
  expense_category: string | null;
  description: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  payment_method: string | null;
  tutor_id: string | null;
  notes: string | null;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_BADGE: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  pago: "bg-emerald-100 text-emerald-800",
  recebido: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-zinc-200 text-zinc-700",
  vencido: "bg-rose-100 text-rose-800",
};

function FinanceiroPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [receiptFor, setReceiptFor] = useState<Tx | null>(null);

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["fin-tx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("due_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tx[];
    },
  });

  const { data: tutors = [] } = useQuery({
    queryKey: ["tutors-min"],
    queryFn: async () => {
      const { data } = await supabase.from("tutors").select("id, full_name").order("full_name");
      return (data ?? []) as Array<{ id: string; full_name: string }>;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento removido");
      qc.invalidateQueries({ queryKey: ["fin-tx"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (tx: Tx) => {
      const { error } = await supabase
        .from("financial_transactions")
        .update({
          status: tx.kind === "receita" ? "recebido" : "pago",
          paid_at: new Date().toISOString().slice(0, 10),
        })
        .eq("id", tx.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Baixa registrada");
      qc.invalidateQueries({ queryKey: ["fin-tx"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Métricas do mês corrente
  const metrics = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const inMonth = (d: string | null) => {
      if (!d) return false;
      const dt = parseISO(d);
      return dt >= start && dt <= end;
    };
    const receivedMonth = txs
      .filter((t) => t.kind === "receita" && t.status === "recebido" && inMonth(t.paid_at))
      .reduce((s, t) => s + Number(t.amount), 0);
    const paidMonth = txs
      .filter((t) => t.kind === "despesa" && t.status === "pago" && inMonth(t.paid_at))
      .reduce((s, t) => s + Number(t.amount), 0);
    const toReceive = txs
      .filter((t) => t.kind === "receita" && t.status === "pendente")
      .reduce((s, t) => s + Number(t.amount), 0);
    const toPay = txs
      .filter((t) => t.kind === "despesa" && t.status === "pendente")
      .reduce((s, t) => s + Number(t.amount), 0);
    const countReceivedMonth = txs.filter(
      (t) => t.kind === "receita" && t.status === "recebido" && inMonth(t.paid_at),
    ).length;
    const avgTicket = countReceivedMonth ? receivedMonth / countReceivedMonth : 0;
    return {
      receivedMonth,
      paidMonth,
      profit: receivedMonth - paidMonth,
      toReceive,
      toPay,
      avgTicket,
    };
  }, [txs]);

  const revenues = txs.filter((t) => t.kind === "receita");
  const expenses = txs.filter((t) => t.kind === "despesa");
  const toReceiveList = revenues.filter((t) => t.status === "pendente");
  const toPayList = expenses.filter((t) => t.status === "pendente");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Fluxo de caixa, contas a pagar e a receber, recibos e indicadores.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo lançamento
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Faturamento (mês)" value={brl(metrics.receivedMonth)} />
        <MetricCard label="Despesas (mês)" value={brl(metrics.paidMonth)} />
        <MetricCard
          label="Lucro (mês)"
          value={brl(metrics.profit)}
          tone={metrics.profit >= 0 ? "positive" : "negative"}
        />
        <MetricCard label="Ticket médio" value={brl(metrics.avgTicket)} />
        <MetricCard label="A receber" value={brl(metrics.toReceive)} />
        <MetricCard label="A pagar" value={brl(metrics.toPay)} />
      </div>

      <Tabs defaultValue="fluxo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="receber">A receber</TabsTrigger>
          <TabsTrigger value="pagar">A pagar</TabsTrigger>
          <TabsTrigger value="debitos">Débitos por tutor</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo">
          <TxTable
            rows={txs}
            loading={isLoading}
            onEdit={(t) => { setEditing(t); setOpen(true); }}
            onDelete={(id) => remove.mutate(id)}
            onPay={(t) => markPaid.mutate(t)}
            onReceipt={(t) => setReceiptFor(t)}
          />
        </TabsContent>
        <TabsContent value="receber">
          <TxTable
            rows={toReceiveList}
            loading={isLoading}
            onEdit={(t) => { setEditing(t); setOpen(true); }}
            onDelete={(id) => remove.mutate(id)}
            onPay={(t) => markPaid.mutate(t)}
            onReceipt={(t) => setReceiptFor(t)}
          />
        </TabsContent>
        <TabsContent value="pagar">
          <TxTable
            rows={toPayList}
            loading={isLoading}
            onEdit={(t) => { setEditing(t); setOpen(true); }}
            onDelete={(id) => remove.mutate(id)}
            onPay={(t) => markPaid.mutate(t)}
            onReceipt={() => null}
          />
        </TabsContent>
        <TabsContent value="relatorios">
          <Reports txs={txs} />
        </TabsContent>
      </Tabs>

      <TxSheet
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
        editing={editing}
        tutors={tutors}
      />

      <ReceiptDialog
        tx={receiptFor}
        tutors={tutors}
        onClose={() => setReceiptFor(null)}
      />
    </div>
  );
}

function MetricCard({
  label, value, tone,
}: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={
            "text-2xl font-semibold " +
            (tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : "")
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function TxTable({
  rows, loading, onEdit, onDelete, onPay, onReceipt,
}: {
  rows: Tx[]; loading: boolean;
  onEdit: (t: Tx) => void;
  onDelete: (id: string) => void;
  onPay: (t: Tx) => void;
  onReceipt: (t: Tx) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum lançamento.
      </div>
    );
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-1" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => {
            const cat = t.kind === "receita"
              ? REVENUE_CATS.find((c) => c.value === t.revenue_category)?.label
              : EXPENSE_CATS.find((c) => c.value === t.expense_category)?.label;
            return (
              <TableRow key={t.id}>
                <TableCell>
                  <Badge variant={t.kind === "receita" ? "default" : "secondary"}>
                    {t.kind === "receita" ? "Receita" : "Despesa"}
                  </Badge>
                </TableCell>
                <TableCell>{cat ?? "—"}</TableCell>
                <TableCell className="max-w-[260px] truncate">{t.description}</TableCell>
                <TableCell>{t.due_date ? format(parseISO(t.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell>{t.paid_at ? format(parseISO(t.paid_at), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell>
                  <span className={"rounded-full px-2 py-0.5 text-xs " + (STATUS_BADGE[t.status] ?? "")}>
                    {t.status}
                  </span>
                </TableCell>
                <TableCell className={"text-right font-medium " + (t.kind === "receita" ? "text-emerald-600" : "text-rose-600")}>
                  {t.kind === "receita" ? "+" : "−"} {brl(Number(t.amount))}
                </TableCell>
                <TableCell className="space-x-1 whitespace-nowrap text-right">
                  {t.status === "pendente" ? (
                    <Button size="icon" variant="ghost" title="Dar baixa" onClick={() => onPay(t)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {t.kind === "receita" ? (
                    <Button size="icon" variant="ghost" title="Recibo" onClick={() => onReceipt(t)}>
                      <ReceiptIcon className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => onEdit(t)}>Editar</Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TxSheet({
  open, onOpenChange, editing, tutors,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Tx | null;
  tutors: Array<{ id: string; full_name: string }>;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<"receita" | "despesa">(editing?.kind ?? "receita");
  const [revCat, setRevCat] = useState<string>(editing?.revenue_category ?? "creche");
  const [expCat, setExpCat] = useState<string>(editing?.expense_category ?? "produtos");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : "");
  const [dueDate, setDueDate] = useState(editing?.due_date ?? "");
  const [paidAt, setPaidAt] = useState(editing?.paid_at ?? "");
  const [status, setStatus] = useState(editing?.status ?? "pendente");
  const [method, setMethod] = useState(editing?.payment_method ?? "");
  const [tutorId, setTutorId] = useState(editing?.tutor_id ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  // reset when editing changes
  useMemoReset(editing, () => {
    setKind(editing?.kind ?? "receita");
    setRevCat(editing?.revenue_category ?? "creche");
    setExpCat(editing?.expense_category ?? "produtos");
    setDescription(editing?.description ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setDueDate(editing?.due_date ?? "");
    setPaidAt(editing?.paid_at ?? "");
    setStatus(editing?.status ?? "pendente");
    setMethod(editing?.payment_method ?? "");
    setTutorId(editing?.tutor_id ?? "");
    setNotes(editing?.notes ?? "");
  });

  const save = useMutation({
    mutationFn: async () => {
      const amt = Number(amount.replace(",", "."));
      if (!description.trim() || !Number.isFinite(amt) || amt < 0) {
        throw new Error("Preencha descrição e valor válidos");
      }
      const payload = {
        kind,
        revenue_category: kind === "receita" ? revCat : null,
        expense_category: kind === "despesa" ? expCat : null,
        description: description.trim(),
        amount: amt,
        due_date: dueDate || null,
        paid_at: paidAt || null,
        status,
        payment_method: method || null,
        tutor_id: tutorId || null,
        notes: notes || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("financial_transactions").update(payload as never).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("financial_transactions")
          .insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Lançamento atualizado" : "Lançamento criado");
      qc.invalidateQueries({ queryKey: ["fin-tx"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "receita" | "despesa")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              {kind === "receita" ? (
                <Select value={revCat} onValueChange={setRevCat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REVENUE_CATS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={expCat} onValueChange={setExpCat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value={kind === "receita" ? "recebido" : "pago"}>
                    {kind === "receita" ? "Recebido" : "Pago"}
                  </SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Data pagamento</Label>
              <Input type="date" value={paidAt ?? ""} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Forma de pagamento</Label>
              <Input value={method ?? ""} onChange={(e) => setMethod(e.target.value)} placeholder="Pix, dinheiro, cartão…" />
            </div>
            {kind === "receita" ? (
              <div>
                <Label>Tutor (opcional)</Label>
                <Select value={tutorId || "none"} onValueChange={(v) => setTutorId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {tutors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : <div />}
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function useMemoReset<T>(dep: T, fn: () => void) {
  // run fn when dep identity changes (open/edit toggle)
  useMemo(() => { fn(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dep]);
}

function Reports({ txs }: { txs: Tx[] }) {
  // Agrupa por mês (YYYY-MM)
  const byMonth = useMemo(() => {
    const map = new Map<string, { receita: number; despesa: number; count: number }>();
    for (const t of txs) {
      const ref = t.paid_at ?? t.due_date;
      if (!ref) continue;
      const key = ref.slice(0, 7);
      const e = map.get(key) ?? { receita: 0, despesa: 0, count: 0 };
      if (t.kind === "receita" && t.status === "recebido") {
        e.receita += Number(t.amount); e.count += 1;
      } else if (t.kind === "despesa" && t.status === "pago") {
        e.despesa += Number(t.amount);
      }
      map.set(key, e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [txs]);

  const byRevCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.kind !== "receita" || t.status !== "recebido") continue;
      const k = t.revenue_category ?? "outros_servicos";
      map.set(k, (map.get(k) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries());
  }, [txs]);

  const byExpCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.kind !== "despesa" || t.status !== "pago") continue;
      const k = t.expense_category ?? "outros";
      map.set(k, (map.get(k) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries());
  }, [txs]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Resumo mensal</CardTitle></CardHeader>
        <CardContent>
          {byMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Ticket médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byMonth.map(([key, v]) => {
                  const [y, m] = key.split("-");
                  const label = format(new Date(Number(y), Number(m) - 1, 1), "MMM/yyyy", { locale: ptBR });
                  const profit = v.receita - v.despesa;
                  const avg = v.count ? v.receita / v.count : 0;
                  return (
                    <TableRow key={key}>
                      <TableCell className="capitalize">{label}</TableCell>
                      <TableCell className="text-right text-emerald-600">{brl(v.receita)}</TableCell>
                      <TableCell className="text-right text-rose-600">{brl(v.despesa)}</TableCell>
                      <TableCell className={"text-right font-medium " + (profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {brl(profit)}
                      </TableCell>
                      <TableCell className="text-right">{brl(avg)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Receitas por categoria</CardTitle></CardHeader>
        <CardContent>
          <CategoryList rows={byRevCat} labels={REVENUE_CATS} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Despesas por categoria</CardTitle></CardHeader>
        <CardContent>
          <CategoryList rows={byExpCat} labels={EXPENSE_CATS} />
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryList({
  rows, labels,
}: { rows: Array<[string, number]>; labels: readonly { value: string; label: string }[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  const total = rows.reduce((s, [, v]) => s + v, 0);
  return (
    <ul className="space-y-2">
      {rows.sort(([, a], [, b]) => b - a).map(([k, v]) => {
        const label = labels.find((l) => l.value === k)?.label ?? k;
        const pct = total ? Math.round((v / total) * 100) : 0;
        return (
          <li key={k}>
            <div className="flex justify-between text-sm">
              <span>{label}</span>
              <span className="font-medium">{brl(v)} <span className="text-muted-foreground">({pct}%)</span></span>
            </div>
            <div className="mt-1 h-2 rounded bg-muted">
              <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ReceiptDialog({
  tx, tutors, onClose,
}: {
  tx: Tx | null;
  tutors: Array<{ id: string; full_name: string }>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [payer, setPayer] = useState("");
  const [doc, setDoc] = useState("");

  useMemoReset(tx, () => {
    if (!tx) return;
    const t = tutors.find((x) => x.id === tx.tutor_id);
    setPayer(t?.full_name ?? "");
    setDoc("");
  });

  const issue = useMutation({
    mutationFn: async () => {
      if (!tx) return null;
      if (!payer.trim()) throw new Error("Informe o pagador");
      const number = `RC-${Date.now().toString().slice(-8)}`;
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("receipts")
        .insert({
          transaction_id: tx.id,
          number,
          payer_name: payer.trim(),
          payer_document: doc.trim() || null,
          amount: tx.amount,
          description: tx.description,
          issued_by: u.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["fin-tx"] });
      toast.success("Recibo emitido");
      if (r) printReceipt(r as { number: string; payer_name: string; payer_document: string | null; amount: number; description: string; issued_at?: string });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!tx} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Emitir recibo</DialogTitle></DialogHeader>
        {tx ? (
          <div className="space-y-3">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p><strong>Descrição:</strong> {tx.description}</p>
              <p><strong>Valor:</strong> {brl(Number(tx.amount))}</p>
            </div>
            <div>
              <Label>Pagador</Label>
              <Input value={payer} onChange={(e) => setPayer(e.target.value)} />
            </div>
            <div>
              <Label>CPF/CNPJ (opcional)</Label>
              <Input value={doc} onChange={(e) => setDoc(e.target.value)} />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => issue.mutate()} disabled={issue.isPending}>
            {issue.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Emitir e imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function printReceipt(r: {
  number: string; payer_name: string; payer_document: string | null;
  amount: number; description: string; issued_at?: string;
}) {
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  const dateStr = format(new Date(r.issued_at ?? new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${r.number}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:680px;margin:40px auto;padding:24px;color:#111}
    h1{font-size:22px;margin:0 0 4px} .meta{color:#666;font-size:13px;margin-bottom:24px}
    .box{border:1px solid #ddd;border-radius:10px;padding:24px;line-height:1.6}
    .row{display:flex;justify-content:space-between;margin-top:24px}
    .sig{margin-top:64px;border-top:1px solid #999;padding-top:6px;text-align:center;width:280px}
    .amount{font-size:20px;font-weight:600}
    @media print{button{display:none}}
  </style></head><body>
  <h1>Recibo de Pagamento</h1>
  <div class="meta">Nº ${r.number} — emitido em ${dateStr}</div>
  <div class="box">
    <p>Recebi de <strong>${escapeHtml(r.payer_name)}</strong>${r.payer_document ? `, portador(a) do documento <strong>${escapeHtml(r.payer_document)}</strong>` : ""}, a quantia de <span class="amount">${brl(Number(r.amount))}</span>, referente a <strong>${escapeHtml(r.description)}</strong>.</p>
    <p>Para clareza, firmo o presente recibo.</p>
    <div class="row"><div></div><div class="sig">Quintal da Gabi</div></div>
  </div>
  <div style="margin-top:24px;text-align:right"><button onclick="window.print()">Imprimir</button></div>
  </body></html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
