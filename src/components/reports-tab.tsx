import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { classifyCategory } from "@/lib/cost-engine";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const fmtBRL = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${(v || 0).toFixed(1)}%`;

interface Props {
  income: any[];
  expenses: any[];
  employees: any[];
  unitSettings: any[];
  daycareStays: any[];
  boardingStays: any[];
  groomingAppointments: any[];
}

export function ReportsTab({
  income,
  expenses,
  employees,
  unitSettings,
  daycareStays,
  boardingStays,
}: Props) {
  const report = useMemo(() => {
    const now = new Date();
    const salaries = employees
      .filter((e) => e.active)
      .reduce((a, e) => a + Number(e.salary || 0), 0);

    const monthly: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const r = income
        .filter((t) => {
          const d = new Date(t.paid_at || t.due_date || t.created_at);
          return d >= s && d < e;
        })
        .reduce((a, t) => a + Number(t.amount || 0), 0);
      const x =
        expenses
          .filter((t) => {
            const d = new Date(t.due_date || t.created_at);
            return d >= s && d < e;
          })
          .reduce((a, t) => a + Number(t.amount || 0), 0) + salaries;
      const lucro = r - x;
      const margem = r > 0 ? (lucro / r) * 100 : 0;
      monthly.push({
        periodo: s.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        faturamento: r,
        despesas: x,
        lucro,
        margem,
      });
    }

    // Anual
    const yearly: any[] = [];
    for (let i = 2; i >= 0; i--) {
      const y = now.getFullYear() - i;
      const s = new Date(y, 0, 1);
      const e = new Date(y + 1, 0, 1);
      const r = income
        .filter((t) => {
          const d = new Date(t.paid_at || t.due_date || t.created_at);
          return d >= s && d < e;
        })
        .reduce((a, t) => a + Number(t.amount || 0), 0);
      const x = expenses
        .filter((t) => {
          const d = new Date(t.due_date || t.created_at);
          return d >= s && d < e;
        })
        .reduce((a, t) => a + Number(t.amount || 0), 0);
      yearly.push({
        ano: String(y),
        faturamento: r,
        despesas: x,
        lucro: r - x,
      });
    }

    // Por serviço
    const byService = new Map<string, number>();
    for (const t of income) {
      const c = (t.revenue_category || "outros") as string;
      byService.set(c, (byService.get(c) ?? 0) + Number(t.amount || 0));
    }
    const services = Array.from(byService.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Ocupação (média mês atual)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysInMonth = Math.max(
      1,
      Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000),
    );
    const daycareCap = unitSettings.reduce(
      (a: number, s: any) => a + Number(s.daycare_capacity || 0),
      0,
    );
    const boardingCap = unitSettings.reduce(
      (a: number, s: any) => a + Number(s.boarding_capacity || 0),
      0,
    );
    const daycareCount = daycareStays.filter((s) => {
      const d = new Date(s.check_in_at);
      return d >= monthStart && d < monthEnd;
    }).length;
    const boardingCount = boardingStays.filter((s) => {
      const d = new Date(s.check_in_at);
      return d >= monthStart && d < monthEnd;
    }).length;
    const occupancy = {
      creche:
        daycareCap > 0
          ? Math.min(100, (daycareCount / (daycareCap * daysInMonth)) * 100)
          : 0,
      hospedagem:
        boardingCap > 0
          ? Math.min(100, (boardingCount / (boardingCap * daysInMonth)) * 100)
          : 0,
    };

    // Despesas por grupo
    const monthExp = expenses.filter((t) => {
      const d = new Date(t.due_date || t.created_at);
      return d >= monthStart && d < monthEnd;
    });
    const fixedTotal =
      salaries +
      monthExp
        .filter(
          (t) =>
            classifyCategory(t.expense_category) === "fixo" &&
            t.expense_category !== "salarios",
        )
        .reduce((a, t) => a + Number(t.amount || 0), 0);
    const variableTotal = monthExp
      .filter((t) => classifyCategory(t.expense_category) === "variavel")
      .reduce((a, t) => a + Number(t.amount || 0), 0);

    const current = monthly[monthly.length - 1];
    const previous = monthly[monthly.length - 2];

    return {
      monthly,
      yearly,
      services,
      occupancy,
      fixedTotal,
      variableTotal,
      current,
      previous,
    };
  }, [income, expenses, employees, unitSettings, daycareStays, boardingStays]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório Financeiro Consolidado", 14, 18);
    doc.setFontSize(10);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")}`,
      14,
      25,
    );

    autoTable(doc, {
      startY: 32,
      head: [["Indicador", "Valor"]],
      body: [
        ["Faturamento (mês atual)", fmtBRL(report.current?.faturamento || 0)],
        ["Despesas (mês atual)", fmtBRL(report.current?.despesas || 0)],
        ["Lucro Líquido", fmtBRL(report.current?.lucro || 0)],
        ["Margem", fmtPct(report.current?.margem || 0)],
        ["Custos Fixos", fmtBRL(report.fixedTotal)],
        ["Custos Variáveis", fmtBRL(report.variableTotal)],
        ["Ocupação Creche", fmtPct(report.occupancy.creche)],
        ["Ocupação Hospedagem", fmtPct(report.occupancy.hospedagem)],
      ],
    });

    autoTable(doc, {
      head: [["Mês", "Faturamento", "Despesas", "Lucro", "Margem"]],
      body: report.monthly.map((m) => [
        m.periodo,
        fmtBRL(m.faturamento),
        fmtBRL(m.despesas),
        fmtBRL(m.lucro),
        fmtPct(m.margem),
      ]),
    });

    autoTable(doc, {
      head: [["Ano", "Faturamento", "Despesas", "Lucro"]],
      body: report.yearly.map((y) => [
        y.ano,
        fmtBRL(y.faturamento),
        fmtBRL(y.despesas),
        fmtBRL(y.lucro),
      ]),
    });

    autoTable(doc, {
      head: [["Serviço", "Faturamento"]],
      body: report.services.map((s) => [s.name, fmtBRL(s.value)]),
    });

    doc.save(`relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Indicador: "Faturamento", Valor: report.current?.faturamento || 0 },
        { Indicador: "Despesas", Valor: report.current?.despesas || 0 },
        { Indicador: "Lucro", Valor: report.current?.lucro || 0 },
        { Indicador: "Margem (%)", Valor: report.current?.margem || 0 },
        { Indicador: "Custos Fixos", Valor: report.fixedTotal },
        { Indicador: "Custos Variáveis", Valor: report.variableTotal },
        { Indicador: "Ocupação Creche (%)", Valor: report.occupancy.creche },
        { Indicador: "Ocupação Hospedagem (%)", Valor: report.occupancy.hospedagem },
      ]),
      "Resumo",
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(report.monthly),
      "Mensal",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(report.yearly),
      "Anual",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(report.services),
      "Servicos",
    );

    XLSX.writeFile(
      wb,
      `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Relatórios Completos</h2>
          <p className="text-sm text-muted-foreground">
            Dados reais do sistema — atualizados automaticamente
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPDF} variant="outline">
            <FileDown className="mr-1.5 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={exportExcel}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Resumo mês atual */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Faturamento" value={fmtBRL(report.current?.faturamento || 0)} />
        <SummaryCard label="Despesas" value={fmtBRL(report.current?.despesas || 0)} />
        <SummaryCard label="Lucro" value={fmtBRL(report.current?.lucro || 0)} />
        <SummaryCard label="Margem" value={fmtPct(report.current?.margem || 0)} />
      </div>

      {/* Comparativo mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Mensal (12 meses)</CardTitle>
          <CardDescription>Evolução do faturamento, despesas e lucro</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.monthly.map((m) => (
                <TableRow key={m.periodo}>
                  <TableCell className="font-medium capitalize">{m.periodo}</TableCell>
                  <TableCell className="text-right text-green-600">{fmtBRL(m.faturamento)}</TableCell>
                  <TableCell className="text-right text-red-600">{fmtBRL(m.despesas)}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${m.lucro >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    {fmtBRL(m.lucro)}
                  </TableCell>
                  <TableCell className="text-right">{fmtPct(m.margem)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Comparativo anual */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Anual</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.yearly.map((y) => (
                <TableRow key={y.ano}>
                  <TableCell className="font-medium">{y.ano}</TableCell>
                  <TableCell className="text-right text-green-600">{fmtBRL(y.faturamento)}</TableCell>
                  <TableCell className="text-right text-red-600">{fmtBRL(y.despesas)}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${y.lucro >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    {fmtBRL(y.lucro)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Desempenho por serviço */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Serviço</CardTitle>
          <CardDescription>Faturamento acumulado por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.services.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Nenhum dado disponível.
                  </TableCell>
                </TableRow>
              )}
              {report.services.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium capitalize">{s.name}</TableCell>
                  <TableCell className="text-right">{fmtBRL(s.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ocupação */}
      <Card>
        <CardHeader>
          <CardTitle>Ocupação Média (mês atual)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Creche</div>
            <div className="text-2xl font-bold">{fmtPct(report.occupancy.creche)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Hospedagem</div>
            <div className="text-2xl font-bold">{fmtPct(report.occupancy.hospedagem)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
