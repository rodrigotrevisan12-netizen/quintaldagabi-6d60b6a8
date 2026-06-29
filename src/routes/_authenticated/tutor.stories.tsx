import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tutor/stories")({
  head: () => ({ meta: [{ title: "Stories — Quintal da Gabi" }] }),
  component: TutorStories,
});

type Story = {
  id: string; dog_id: string; media_url: string; media_type: "photo"|"video";
  caption: string|null; created_at: string;
  dog: { id: string; name: string; photo_url: string|null }|null;
};

function TutorStories() {
  const { data: stories = [] } = useQuery({
    queryKey: ["tutor-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dog_stories")
        .select("*,dog:dogs(id,name,photo_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Story[];
    },
  });

  // groups by dog
  const groups: Record<string, Story[]> = {};
  stories.forEach((s) => { (groups[s.dog_id] ||= []).push(s); });
  const dogs = Object.entries(groups).map(([id, items]) => ({ id, items, dog: items[0].dog }));

  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Stories dos seus cães</h1>

      {!dogs.length ? (
        <p className="text-sm text-muted-foreground">Nenhum story disponível agora. Eles aparecem aqui por 24h após a publicação.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {dogs.map(({ id, items, dog }) => (
            <button key={id} onClick={() => setActive(id)} className="flex w-20 shrink-0 flex-col items-center gap-1">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-amber-500 p-[3px]">
                <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-card">
                  {dog?.photo_url ? <img src={dog.photo_url} className="h-full w-full object-cover" alt="" />
                    : <span className="text-2xl">🐕</span>}
                </span>
              </span>
              <span className="truncate text-xs">{dog?.name}</span>
              <span className="text-[10px] text-muted-foreground">{items.length}</span>
            </button>
          ))}
        </div>
      )}

      {active && (
        <StoryViewer
          items={groups[active]}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function StoryViewer({ items, onClose }: { items: Story[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const cur = items[idx];

  const { data: url } = useQuery({
    queryKey: ["story-url", cur.id, cur.media_url],
    queryFn: async () => {
      // media_url pode estar salvo como "stories/<dog>/<file>" ou só "<dog>/<file>"
      const path = cur.media_url.replace(/^stories\//, "");
      const { data, error } = await supabase.storage.from("stories").createSignedUrl(path, 3600);
      if (error) {
        // tenta usar o caminho exato como fallback
        const fb = await supabase.storage.from("stories").createSignedUrl(cur.media_url, 3600);
        return fb.data?.signedUrl ?? null;
      }
      return data?.signedUrl ?? null;
    },
  });

  useEffect(() => {
    if (cur.media_type !== "photo") return;
    const t = setTimeout(() => {
      if (idx < items.length - 1) setIdx(idx + 1);
      else onClose();
    }, 5000);
    return () => clearTimeout(t);
  }, [idx, cur, items.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4">
      <Button size="icon" variant="ghost" className="absolute right-4 top-4 text-white" onClick={onClose}><X /></Button>
      <Button size="icon" variant="ghost" className="absolute left-4 top-1/2 text-white" disabled={idx===0} onClick={() => setIdx(idx-1)}><ChevronLeft /></Button>
      <Button size="icon" variant="ghost" className="absolute right-4 top-1/2 text-white" disabled={idx===items.length-1} onClick={() => setIdx(idx+1)}><ChevronRight /></Button>

      <div className="flex max-h-[80vh] max-w-md flex-col items-center gap-3">
        <div className="flex w-full gap-1">
          {items.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded ${i<=idx?"bg-white":"bg-white/30"}`} />
          ))}
        </div>
        {url ? (cur.media_type === "video"
          ? <video src={url} controls autoPlay onEnded={() => idx<items.length-1 ? setIdx(idx+1) : onClose()} className="max-h-[70vh] rounded-lg" />
          : <img src={url} className="max-h-[70vh] rounded-lg" alt={cur.caption ?? ""} />
        ) : <p className="text-white">Carregando…</p>}
        {cur.caption && <p className="text-center text-white">{cur.caption}</p>}
        <p className="text-xs text-white/60">{new Date(cur.created_at).toLocaleString("pt-BR")}</p>
      </div>
    </div>
  );
}
