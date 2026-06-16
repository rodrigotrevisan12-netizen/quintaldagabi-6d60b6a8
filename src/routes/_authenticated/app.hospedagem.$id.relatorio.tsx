import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/hospedagem/$id/relatorio")({
  head: () => ({ meta: [{ title: "Relatório de hospedagem" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();

  const stayQuery = useQuery({
    queryKey: ["boarding-report", id],
    queryFn: async () => {
      const { data: stay, error } = await supabase
        .from("boarding_stays")
        .select(
          "*,dog:dogs(id,name,breed,size,photo_url,tutor:tutors(full_name,phone,email))",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      const [food, meds, bel, logs] = await Promise.all([
        supabase.from("boarding_food").select("*").eq("stay_id", id),
        supabase.from("boarding_medications").select("*").eq("stay_id", id),
        supabase.from("boarding_belongings").select("*").eq("stay_id", id),
        supabase.from("boarding_daily_logs").select("*").eq("stay_id", id).order("log_date"),
      ]);
      return {
        stay,
        food: food.data ?? [],
        meds: meds.data ?? [],
        belongings: bel.data ?? [],
        logs: logs.data ?? [],
      };
    },
  });

  useEffect(() => {
    document.body.classList.add("bg-white");
    return () => document.body.classList.remove("bg-white");
  }, []);

  if (stayQuery.isLoading) {
    return <Loader2 className="m-12 h-6 w-6 animate-spin" />;
  }
  if (!stayQuery.data) return <p>Não encontrada.</p>;

  const { stay, food, meds, belongings, logs } = stayQuery.data;
  const start = new Date(stay.check_in_at);
  const end = new Date(stay.check_out_at ?? stay.expected_check_out_at);
  const days = Math.max(1, differenceInCalendarDays(end, start));
  const total = (Number(stay.daily_rate) || 0) * days;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      <div className="mb-6 flex items-start justify-between border-b pb-4 print:hidden">
        <h1 className="font-display text-2xl font-semibold">Relatório de hospedagem</h1>
        <Button onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <header className="mb-6 border-b pb-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Quintal da Gabi · Hotel para cães</p>
        <h2 className="mt-2 text-xl font-semibold">{(stay as any).dog?.name}</h2>
        <p className="text-sm text-gray-600">
          Tutor: {(stay as any).dog?.tutor?.full_name ?? "—"}
          {(stay as any).dog?.tutor?.phone ? ` · ${(stay as any).dog.tutor.phone}` : ""}
        </p>
      </header>

      <Section title="Estadia">
        <Row label="Entrada" value={format(start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
        <Row label="Saída prevista" value={format(new Date(stay.expected_check_out_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
        <Row label="Saída efetiva" value={stay.check_out_at ? format(new Date(stay.check_out_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Em andamento"} />
        {stay.kennel ? <Row label="Baia" value={stay.kennel} /> : null}
        <Row label="Dias" value={String(days)} />
        <Row label="Diária" value={brl(Number(stay.daily_rate) || 0)} />
        <Row label="Total" value={<strong>{brl(total)}</strong>} />
      </Section>

      {food.length > 0 && (
        <Section title="Alimentação">
          {food.map((f: any) => (
            <p key={f.id} className="text-sm">
              · {f.brand ?? "Sem marca"} ({f.source === "propria" ? "trazida" : "da casa"})
              {f.portion_g ? `, ${f.portion_g}g por porção` : ""}
              {f.meals_per_day ? `, ${f.meals_per_day}x ao dia` : ""}
              {f.total_amount_g ? `, total ${f.total_amount_g}g` : ""}
              {f.notes ? ` — ${f.notes}` : ""}
            </p>
          ))}
        </Section>
      )}

      {meds.length > 0 && (
        <Section title="Medicamentos">
          {meds.map((m: any) => (
            <p key={m.id} className="text-sm">
              · {m.medication} {m.dose ? `(${m.dose})` : ""}
              {m.frequency ? ` — ${m.frequency}` : ""}
              {m.schedule ? ` — horários: ${m.schedule}` : ""}
            </p>
          ))}
        </Section>
      )}

      {belongings.length > 0 && (
        <Section title="Pertences entregues">
          {belongings.map((b: any) => (
            <p key={b.id} className="text-sm">
              · {b.item} x{b.quantity} {b.returned ? "(devolvido)" : "(pendente)"}
            </p>
          ))}
        </Section>
      )}

      {logs.length > 0 && (
        <Section title="Diário da estadia">
          {logs.map((l: any) => (
            <div key={l.id} className="border-b py-2 text-sm last:border-0">
              <p className="font-medium">
                {format(new Date(l.log_date + "T00:00"), "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <p className="text-gray-600">
                {l.fed_ok ? "✅ alimentação" : "⚠️ alimentação"} · {l.medication_ok ? "✅ medicação" : "⚠️ medicação"}
                {l.mood ? ` · humor: ${l.mood}` : ""}
              </p>
              {l.notes ? <p>{l.notes}</p> : null}
            </div>
          ))}
        </Section>
      )}

      {stay.notes && (
        <Section title="Observações">
          <p className="whitespace-pre-wrap text-sm">{stay.notes}</p>
        </Section>
      )}

      <footer className="mt-8 border-t pt-4 text-xs text-gray-500">
        Emitido em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 font-semibold uppercase tracking-wide text-xs text-gray-500">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b py-1 text-sm last:border-0">
      <span className="text-gray-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
