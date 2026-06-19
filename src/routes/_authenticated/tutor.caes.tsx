import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/tutor/caes")({
  head: () => ({ meta: [{ title: "Meus cães — Quintal da Gabi" }] }),
  component: CaesIndex,
});

function CaesIndex() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Se houver child route ativa (/tutor/caes/:id), renderiza só ela
  if (pathname !== "/tutor/caes") return <Outlet />;
  return <List />;
}

function List() {
  const { data: me } = useCurrentUser();
  const { data: dogs } = useQuery({
    queryKey: ["tutor-dogs", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data: t } = await supabase.from("tutors").select("id").eq("user_id", me!.userId).maybeSingle();
      if (!t) return [];
      const { data } = await supabase.from("dogs").select("id, name, breed, photo_url, birth_date").eq("tutor_id", t.id);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">Meus cães</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dogs?.map((d) => (
          <Link key={d.id} to="/tutor/caes/$id" params={{ id: d.id }}>
            <Card className="hover:border-primary">
              <CardContent className="flex items-center gap-3 p-4">
                {d.photo_url ? <img src={d.photo_url} className="h-14 w-14 rounded-full object-cover" /> :
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-muted"><Dog className="h-6 w-6" /></span>}
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.breed ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
