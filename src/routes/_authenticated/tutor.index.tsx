import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dog, Newspaper, FileText, Receipt, Send, Syringe } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/tutor/")({
  head: () => ({ meta: [{ title: "Área do tutor — Quintal da Gabi" }] }),
  component: TutorHome,
});

function TutorHome() {
  const { data: me } = useCurrentUser();

  const { data: tutor } = useQuery({
    queryKey: ["my-tutor", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data } = await supabase.from("tutors").select("id, full_name").eq("user_id", me!.userId).maybeSingle();
      return data;
    },
  });

  const { data: dogs } = useQuery({
    queryKey: ["my-dogs", tutor?.id],
    enabled: !!tutor?.id,
    queryFn: async () => {
      const { data } = await supabase.from("dogs").select("id, name, breed, photo_url").eq("tutor_id", tutor!.id);
      return data ?? [];
    },
  });

  const { data: arrival } = useQuery({
    queryKey: ["arrival-active", tutor?.id],
    enabled: !!tutor?.id,
    queryFn: async () => {
      const { data } = await supabase.from("arrival_notifications")
        .select("*").eq("tutor_id", tutor!.id).eq("status","on_the_way")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Olá, {tutor?.full_name?.split(" ")[0] ?? "tutor"}!</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seus cães, boletins e documentos.</p>
      </header>

      {arrival ? (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <Badge>Estou a caminho</Badge>
              <p className="mt-1 text-sm">Chegada estimada em <strong>{arrival.eta_minutes} min</strong></p>
            </div>
            <Link to="/tutor/chegada"><span className="text-sm text-primary underline">Gerenciar</span></Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickCard to="/tutor/chegada" icon={Send} label="Estou a caminho" />
        <QuickCard to="/tutor/boletins" icon={Newspaper} label="Boletins" />
        <QuickCard to="/tutor/documentos" icon={FileText} label="Contratos" />
        <QuickCard to="/tutor/financeiro" icon={Receipt} label="Recibos" />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Meus cães</h2>
        {!dogs?.length ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum cão cadastrado.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dogs.map((d) => (
              <Link key={d.id} to="/tutor/caes/$id" params={{ id: d.id }}>
                <Card className="hover:border-primary">
                  <CardContent className="flex items-center gap-3 p-4">
                    {d.photo_url ? <img src={d.photo_url} alt={d.name} className="h-12 w-12 rounded-full object-cover" /> :
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted"><Dog className="h-5 w-5" /></span>}
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.breed ?? "—"}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickCard({ to, icon: Icon, label }: { to: any; icon: any; label: string }) {
  return (
    <Link to={to}>
      <Card className="hover:border-primary">
        <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
          <Icon className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
