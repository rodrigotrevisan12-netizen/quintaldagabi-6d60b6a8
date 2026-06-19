import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/tutor/boletins")({
  head: () => ({ meta: [{ title: "Boletins — Quintal da Gabi" }] }),
  component: Boletins,
});

function Boletins() {
  const { data: me } = useCurrentUser();

  const { data: reports } = useQuery({
    queryKey: ["tutor-reports", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data: t } = await supabase.from("tutors").select("id").eq("user_id", me!.userId).maybeSingle();
      if (!t) return [];
      const { data: dogs } = await supabase.from("dogs").select("id, name").eq("tutor_id", t.id);
      const ids = (dogs ?? []).map((d) => d.id);
      if (!ids.length) return [];
      const { data } = await supabase.from("daily_reports")
        .select("id, date, dog_id, published")
        .in("dog_id", ids).eq("published", true)
        .order("date", { ascending: false });
      const byDog = Object.fromEntries((dogs ?? []).map((d) => [d.id, d.name]));
      return (data ?? []).map((r) => ({ ...r, dog_name: byDog[r.dog_id] }));
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">Boletins</h1>
      {!reports?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum boletim publicado ainda.</p>
      ) : reports.map((r: any) => (
        <Card key={r.id}><CardContent className="p-4">
          <p className="font-medium">{r.dog_name}</p>
          <p className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString("pt-BR")}</p>
        </CardContent></Card>
      ))}
    </div>
  );
}
