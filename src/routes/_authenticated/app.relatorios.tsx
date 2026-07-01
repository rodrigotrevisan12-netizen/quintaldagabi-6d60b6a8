import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileDown, FileSpreadsheet, BarChart3, Users, Wallet, Dog, BedDouble, Trophy, AlertCircle, UserCog } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Quintal da Gabi" }] }),
  component: RelatoriosPage,
});

type ReportRow = Record<string, string | number>;
type Report = { key: string; title: string; columns: { key: string; label: string }[]; rows: ReportRow[] };

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function exportExcel(report: Report) {
  const data = report.rows.map((r) => {
    const o: Record<string, unknown> = {};
    report.columns.forEach((c) => (o[c.label] = r[c.key]));
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, report.title.slice(0, 30));
  XLSX.writeFile(wb, `${report.key}-${format(new Date(), "yyyyMMdd")}.xlsx`);
}

function exportPDF(report: Report) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`Quintal da Gabi — ${report.title}`, 14, 14);
  doc.setFontSize(9);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 20);
  autoTable(doc, {
    startY: 26,
    head: [report.columns.map((c) => c.label)],
    body: report.rows.map((r) => report.columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${report.key}-${format(new Date(), "yyyyMMdd")}.pdf`);
}

function RelatoriosPage() {
  const today = new Date();
  const [from, setFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const data = useQuery({
    queryKey: ["relatorios", from, to],
    queryFn: async () => {
      const fromISO = new Date(from + "T00:00:00").toISOString();
      const toISO = new Date(to + "T23:59:59").toISOString();
      const inactiveCutoff = subDays(today, 60).toISOString();

      const [tx, tutors, dogs, daycare, boarding, grooming, employees, comms] = await Promise.all([
        supabase.from("financial_transactions").select("*").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("tutors").select("id,full_name,created_at"),
        supabase.from("dogs").select("id,name,tutor_id,breed,created_at"),
        supabase.from("daycare_stays").select("*").gte("check_in_at", fromISO).lte("check_in_at", toISO),
        supabase.from("boarding_stays").select("*").gte("check_in_at", fromISO).lte("check_in_at", toISO),
        supabase.from("grooming_appointments").select("*").gte("scheduled_at", fromISO).lte("scheduled_at", toISO),
        supabase.from("employees").select("*"),
        supabase.from("internal_communications").select("*").gte("created_at", fromISO).lte("created_at", toISO),
      ]);

      // Activity per tutor (last visit)
      const allStays = await supabase
        .from("daycare_stays")
        .select("dog_id,check_in_at")
        .order("check_in_at", { ascending: false })
        .limit(2000);

      return {
        tx: tx.data ?? [],
        tutors: tutors.data ?? [],
        dogs: dogs.data ?? [],
        daycare: daycare.data ?? [],
        boarding: boarding.data ?? [],
        grooming: grooming.data ?? [],
        employees: employees.data ?? [],
        comms: comms.data ?? [],
        allStays: allStays.data ?? [],
        inactiveCutoff,
      };
    },
  });

  const reports = useMemo<Record<string, Report>>(() => {
    if (!data.data) return {} as Record<string, Report>;
    const d = data.data;
    const dogById = new Map(d.dogs.map((x: any) => [x.id, x]));
    const tutorById = new Map(d.tutors.map((x: any) => [x.id, x]));

    // Last visit per dog
    const lastVisitByDog = new Map<string, string>();
    for (const s of d.allStays as any[]) {
      if (!lastVisitByDog.has(s.dog_id)) lastVisitByDog.set(s.dog_id, s.check_in_at);
    }
    const lastVisitByTutor = new Map<string, string>();
    for (const dog of d.dogs as any[]) {
      const lv = lastVisitByDog.get(dog.id);
      if (!lv) continue;
      const cur = lastVisitByTutor.get(dog.tutor_id);
      if (!cur || lv > cur) lastVisitByTutor.set(dog.tutor_id, lv);
    }

    const cutoff = d.inactiveCutoff;

    // Clientes ativos / inativos
    const ativos: ReportRow[] = [];
    const inativos: ReportRow[] = [];
    for (const t of d.tutors as any[]) {
      const lv = lastVisitByTutor.get(t.id);
      const row = {
        nome: t.full_name,
        ultima_visita: lv ? format(new Date(lv), "dd/MM/yyyy") : "—",
        dias: lv ? differenceInDays(today, new Date(lv)) : "—",
      };
      if (lv && lv >= cutoff) ativos.push(row);
      else inativos.push(row);
    }

    // Faturamento / lucro
    const receitas = (d.tx as any[]).filter((t) => t.kind === "receita" || t.kind === "revenue");
    const despesas = (d.tx as any[]).filter((t) => t.kind === "despesa" || t.kind === "expense");
    const sumBy = <T,>(arr: T[], fn: (x: T) => number) => arr.reduce((a, b) => a + fn(b), 0);
    const totalReceita = sumBy(receitas, (r: any) => Number(r.amount));
    const totalDespesa = sumBy(despesas, (r: any) => Number(r.amount));

    const fatRows: ReportRow[] = [
      { metrica: "Receita bruta", valor: fmtBRL(totalReceita) },
      { metrica: "Despesas", valor: fmtBRL(totalDespesa) },
      { metrica: "Lucro", valor: fmtBRL(totalReceita - totalDespesa) },
      { metrica: "Ticket médio (receita)", valor: receitas.length ? fmtBRL(totalReceita / receitas.length) : "—" },
      { metrica: "Lançamentos receita", valor: receitas.length },
      { metrica: "Lançamentos despesa", valor: despesas.length },
    ];

    // Receita por categoria
    const recByCat = new Map<string, number>();
    for (const r of receitas) {
      const k = r.revenue_category ?? "—";
      recByCat.set(k, (recByCat.get(k) ?? 0) + Number(r.amount));
    }
    const lucroRows: ReportRow[] = Array.from(recByCat.entries()).map(([cat, v]) => ({
      categoria: cat, total: fmtBRL(v),
    }));

    // Ocupação creche por dia
    const daycareByDay = new Map<string, number>();
    for (const s of d.daycare as any[]) {
      const k = format(new Date(s.check_in_at), "dd/MM/yyyy");
      daycareByDay.set(k, (daycareByDay.get(k) ?? 0) + 1);
    }
    const crecheRows = Array.from(daycareByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dia, n]) => ({ dia, caes: n }));

    // Ocupação hospedagem
    const boardingRows: ReportRow[] = (d.boarding as any[]).map((s) => ({
      dog: dogById.get(s.dog_id)?.name ?? "—",
      check_in: format(new Date(s.check_in_at), "dd/MM/yyyy"),
      check_out: s.check_out_at ? format(new Date(s.check_out_at), "dd/MM/yyyy") : "em curso",
      diarias: s.check_out_at
        ? Math.max(1, differenceInDays(new Date(s.check_out_at), new Date(s.check_in_at)))
        : differenceInDays(today, new Date(s.check_in_at)),
      diaria: s.daily_rate ? fmtBRL(Number(s.daily_rate)) : "—",
    }));

    // Ranking clientes por receita
    const recByTutor = new Map<string, number>();
    for (const r of receitas) {
      if (!r.tutor_id) continue;
      recByTutor.set(r.tutor_id, (recByTutor.get(r.tutor_id) ?? 0) + Number(r.amount));
    }
    const rankClientes = Array.from(recByTutor.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([id, v], i) => ({
        pos: i + 1,
        cliente: tutorById.get(id)?.full_name ?? "—",
        total: fmtBRL(v),
      }));

    // Ranking serviços (por categoria de receita)
    const rankServicos = Array.from(recByCat.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([servico, v], i) => ({
        pos: i + 1,
        servico,
        total: fmtBRL(v),
        lancamentos: receitas.filter((r: any) => (r.revenue_category ?? "—") === servico).length,
      }));

    // Histórico dos cães (atendimentos no período)
    const dogVisits = new Map<string, number>();
    for (const s of d.daycare as any[]) dogVisits.set(s.dog_id, (dogVisits.get(s.dog_id) ?? 0) + 1);
    for (const s of d.boarding as any[]) dogVisits.set(s.dog_id, (dogVisits.get(s.dog_id) ?? 0) + 1);
    for (const s of d.grooming as any[]) dogVisits.set(s.dog_id, (dogVisits.get(s.dog_id) ?? 0) + 1);
    const historicoCaes = Array.from(dogVisits.entries())
      .map(([id, n]) => ({
        cao: dogById.get(id)?.name ?? "—",
        raca: dogById.get(id)?.breed ?? "—",
        atendimentos: n,
      }))
      .sort((a, b) => Number(b.atendimentos) - Number(a.atendimentos));

    // Ocorrências
    const ocorrencias: ReportRow[] = (d.comms as any[])
      .filter((c) => c.comm_type === "ocorrencia" || c.priority === "alta" || c.priority === "urgente")
      .map((c) => ({
        data: format(new Date(c.created_at), "dd/MM/yyyy HH:mm"),
        titulo: c.title ?? "—",
        tipo: c.comm_type ?? "—",
        prioridade: c.priority ?? "—",
        status: c.status ?? "—",
      }));

    // Desempenho funcionários
    const byEmp = new Map<string, { boletins: number; banhos: number; comms: number }>();
    const ensure = (id: string) =>
      byEmp.get(id) ?? byEmp.set(id, { boletins: 0, banhos: 0, comms: 0 }).get(id)!;
    for (const g of d.grooming as any[]) if (g.groomer_id) ensure(g.groomer_id).banhos++;
    for (const c of d.comms as any[]) if (c.author_id) ensure(c.author_id).comms++;
    const empById = new Map((d.employees as any[]).map((e) => [e.user_id, e]));
    const desempenho = Array.from(byEmp.entries()).map(([id, v]) => ({
      funcionario: empById.get(id)?.full_name ?? "—",
      cargo: empById.get(id)?.job_role ?? "—",
      banhos_tosas: v.banhos,
      comunicados: v.comms,
    }));

    return {
      ativos: { key: "clientes-ativos", title: "Clientes ativos", columns: [
        { key: "nome", label: "Cliente" }, { key: "ultima_visita", label: "Última visita" }, { key: "dias", label: "Dias atrás" },
      ], rows: ativos },
      inativos: { key: "clientes-inativos", title: "Clientes inativos (60+ dias)", columns: [
        { key: "nome", label: "Cliente" }, { key: "ultima_visita", label: "Última visita" }, { key: "dias", label: "Dias atrás" },
      ], rows: inativos },
      faturamento: { key: "faturamento", title: "Faturamento e lucro", columns: [
        { key: "metrica", label: "Métrica" }, { key: "valor", label: "Valor" },
      ], rows: fatRows },
      lucro: { key: "lucro-categoria", title: "Receita por categoria", columns: [
        { key: "categoria", label: "Categoria" }, { key: "total", label: "Total" },
      ], rows: lucroRows },
      creche: { key: "ocupacao-creche", title: "Ocupação da creche", columns: [
        { key: "dia", label: "Dia" }, { key: "caes", label: "Cães" },
      ], rows: crecheRows },
      hospedagem: { key: "ocupacao-hospedagem", title: "Ocupação da hospedagem", columns: [
        { key: "dog", label: "Cão" }, { key: "check_in", label: "Entrada" }, { key: "check_out", label: "Saída" }, { key: "diarias", label: "Diárias" }, { key: "diaria", label: "Valor diária" },
      ], rows: boardingRows },
      rankClientes: { key: "ranking-clientes", title: "Ranking de clientes", columns: [
        { key: "pos", label: "#" }, { key: "cliente", label: "Cliente" }, { key: "total", label: "Total gasto" },
      ], rows: rankClientes },
      rankServicos: { key: "ranking-servicos", title: "Ranking de serviços", columns: [
        { key: "pos", label: "#" }, { key: "servico", label: "Serviço" }, { key: "lancamentos", label: "Lançamentos" }, { key: "total", label: "Total" },
      ], rows: rankServicos },
      historicoCaes: { key: "historico-caes", title: "Histórico dos cães", columns: [
        { key: "cao", label: "Cão" }, { key: "raca", label: "Raça" }, { key: "atendimentos", label: "Atendimentos" },
      ], rows: historicoCaes },
      ocorrencias: { key: "ocorrencias", title: "Ocorrências", columns: [
        { key: "data", label: "Data" }, { key: "titulo", label: "Título" }, { key: "tipo", label: "Tipo" }, { key: "prioridade", label: "Prioridade" }, { key: "status", label: "Status" },
      ], rows: ocorrencias },
      desempenho: { key: "desempenho-funcionarios", title: "Desempenho dos funcionários", columns: [
        { key: "funcionario", label: "Funcionário" }, { key: "cargo", label: "Cargo" }, { key: "banhos_tosas", label: "Banho & tosa" }, { key: "comunicados", label: "Comunicados" },
      ], rows: desempenho },
    };
  }, [data.data]);

  const tabs = [
    { v: "ativos", label: "Clientes ativos", icon: Users },
    { v: "inativos", label: "Inativos", icon: Users },
    { v: "faturamento", label: "Faturamento", icon: Wallet },
    { v: "lucro", label: "Receita p/ categoria", icon: BarChart3 },
    { v: "creche", label: "Creche", icon: Dog },
    { v: "hospedagem", label: "Hospedagem", icon: BedDouble },
    { v: "rankClientes", label: "Top clientes", icon: Trophy },
    { v: "rankServicos", label: "Top serviços", icon: Trophy },
    { v: "historicoCaes", label: "Histórico dos cães", icon: Dog },
    { v: "ocorrencias", label: "Ocorrências", icon: AlertCircle },
    { v: "desempenho", label: "Funcionários", icon: UserCog },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Relatórios</h1>
          <p className="text-muted-foreground">Análises completas com exportação para PDF e Excel.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="from">De</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label htmlFor="to">Até</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        </div>
      </div>

      {data.isLoading ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Carregando relatórios…</CardContent></Card>
      ) : (
        <Tabs defaultValue="faturamento">
          <TabsList className="flex flex-wrap h-auto">
            {tabs.map((t) => (
              <TabsTrigger key={t.v} value={t.v} className="gap-1">
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((t) => {
            const r = reports[t.v];
            if (!r) return null;
            return (
              <TabsContent key={t.v} value={t.v} className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <div>
                      <CardTitle>{r.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Período: {format(new Date(from), "dd/MM/yyyy")} – {format(new Date(to), "dd/MM/yyyy")} ·{" "}
                        <Badge variant="secondary">{r.rows.length} registros</Badge>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => exportExcel(r)} disabled={!r.rows.length}>
                        <FileSpreadsheet className="mr-1 h-4 w-4" />Excel
                      </Button>
                      <Button size="sm" onClick={() => exportPDF(r)} disabled={!r.rows.length}>
                        <FileDown className="mr-1 h-4 w-4" />PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {r.rows.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {r.columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {r.rows.slice(0, 200).map((row, i) => (
                              <TableRow key={i}>
                                {r.columns.map((c) => <TableCell key={c.key}>{row[c.key]}</TableCell>)}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {r.rows.length > 200 ? (
                          <p className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                            Exibindo 200 de {r.rows.length}. Exporte para ver todos.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
