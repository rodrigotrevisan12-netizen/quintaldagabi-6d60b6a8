import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

function Dot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Selo da Creche: quantos tutores estão "a caminho" agora, em tempo real. */
export function ChegadasBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const { count: c } = await supabase
        .from("arrival_notifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "on_the_way");
      if (active) setCount(c ?? 0);
    }
    load();

    const channel = supabase
      .channel("nav-arrivals-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "arrival_notifications" }, load)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return <Dot count={count} />;
}

/** Selo da Comunicação: quantos avisos/ocorrências/mensagens novas desde a última vez que a pessoa entrou lá. */
export function ComunicacaoBadge() {
  const { data: count = 0 } = useQuery({
    queryKey: ["comunicacao-unseen-count"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return 0;

      const { data: seenRow } = await (supabase as any)
        .from("user_last_seen")
        .select("last_seen_at")
        .eq("user_id", uid)
        .eq("area", "comunicacao")
        .maybeSingle();
      const since = seenRow?.last_seen_at ?? "1970-01-01";

      const [avisos, ocorrencias, mensagens] = await Promise.all([
        (supabase as any).from("internal_communications").select("*", { count: "exact", head: true }).gt("created_at", since),
        (supabase as any).from("occurrences").select("*", { count: "exact", head: true }).gt("created_at", since).eq("resolved", false),
        (supabase as any).from("chat_messages").select("*", { count: "exact", head: true }).gt("created_at", since).neq("author_id", uid),
      ]);

      return (avisos.count ?? 0) + (ocorrencias.count ?? 0) + (mensagens.count ?? 0);
    },
    refetchInterval: 30_000,
  });

  return <Dot count={count} />;
}

/** Escolhe qual selo mostrar, de acordo com a rota do item de menu. */
export function NavItemBadge({ to }: { to: string }) {
  if (to === "/app/agenda") return <ChegadasBadge />;
  if (to === "/app/comunicacao") return <ComunicacaoBadge />;
  return null;
}
export async function markComunicacaoSeen() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await (supabase as any)
    .from("user_last_seen")
    .upsert({ user_id: uid, area: "comunicacao", last_seen_at: new Date().toISOString() });
}
