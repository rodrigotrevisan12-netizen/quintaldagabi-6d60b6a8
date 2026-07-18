import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export function Dot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/**
 * Quantos tutores estão "a caminho" agora, em tempo real. Chamado UMA VEZ
 * lá no topo do menu (AppShell) — assim funciona mesmo com o grupo
 * "Operação do dia" fechado, sem precisar abrir pra "ativar" a contagem.
 */
export function useChegadasCount(): number {
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

  return count;
}

/** Quantos avisos/ocorrências/mensagens novas desde a última vez que a pessoa entrou em Comunicação. */
export function useComunicacaoCount(): number {
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

  return count;
}

/** Chama isso quando a pessoa ENTRA na tela de Comunicação, pra zerar o selo. */
export async function markComunicacaoSeen() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await (supabase as any)
    .from("user_last_seen")
    .upsert({ user_id: uid, area: "comunicacao", last_seen_at: new Date().toISOString() });
}
