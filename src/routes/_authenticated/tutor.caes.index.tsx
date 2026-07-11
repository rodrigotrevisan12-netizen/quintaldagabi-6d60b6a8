import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dog } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/tutor/caes")({
  head: () => ({ meta: [{ title: "Meus cães — Área do tutor" }] }),
  component: MyDogs,
});

function MyDogs() {
  const { data: me } = useCurrentUser();

  const { data: tutor } = useQuery({
    queryKey: ["my-tutor", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("tutors")
        .select("id")
        .eq("user_id", me!.userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: dogs, isLoading } = useQuery({
    queryKey: ["my-dogs", tutor?.id],
    enabled: !!tutor?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("dogs")
        .select("id, name, breed, photo_url, birth_date")
        .eq("tutor_id", tutor!.id)
        .order("name");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Meus cães</h1>
        <p className="text-sm text-muted-foreground">
          Toque em um cão para ver a ficha, saúde, boletins e documentos.
        </p>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Carregando…</CardContent>
        </Card>
      ) : !dogs?.length ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum cão cadastrado ainda. Fale com a recepção para incluir seu peludo.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dogs.map((d) => (
            <Link key={d.id} to="/tutor/caes/$id" params={{ id: d.id }}>
              <Card className="transition hover:border-primary">
                <CardContent className="flex items-center gap-3 p-4">
                  {d.photo_url ? (
                    <img
                      src={d.photo_url}
                      alt={d.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-muted">
                      <Dog className="h-6 w-6" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.breed ?? "Sem raça informada"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
