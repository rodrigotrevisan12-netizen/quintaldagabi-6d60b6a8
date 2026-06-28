import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/stories")({
  head: () => ({ meta: [{ title: "Stories — Quintal da Gabi" }] }),
  component: StoriesPage,
});

type Story = {
  id: string; dog_id: string; media_url: string; media_type: "photo"|"video";
  caption: string|null; created_at: string; expires_at: string;
  dog: { id: string; name: string; tutor: { full_name: string }|null }|null;
};

function StoriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dog_stories")
        .select("*,dog:dogs(id,name,tutor:tutors(full_name))")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Story[];
    },
  });

  const remove = useMutation({
    mutationFn: async (s: Story) => {
      const path = s.media_url.replace(/^stories\//, "");
      if (path) await supabase.storage.from("stories").remove([path]);
      const { error } = await supabase.from("dog_stories").delete().eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Story removido"); qc.invalidateQueries({ queryKey: ["stories-all"] }); },
  });

  // Agrupa por cão
  const groups = stories.reduce<Record<string, Story[]>>((acc, s) => {
    const k = s.dog_id;
    (acc[k] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Stories</h1>
          <p className="text-sm text-muted-foreground">Publique fotos e vídeos dos cães. Visíveis ao tutor por 24h.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Novo story</Button>
      </header>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> :
        !stories.length ? <p className="text-sm text-muted-foreground">Nenhum story ativo.</p> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(groups).map(([dogId, items]) => {
            const d = items[0].dog;
            return (
              <Card key={dogId}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-lg">{d?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{d?.tutor?.full_name ?? ""}</p>
                    </div>
                    <Badge variant="outline">{items.length} ativo{items.length===1?"":"s"}</Badge>
                  </div>
                  <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
                    {items.map((s) => (
                      <div key={s.id} className="relative shrink-0">
                        <MediaThumb story={s} />
                        <Button size="icon" variant="destructive" className="absolute right-1 top-1 h-6 w-6"
                          onClick={() => remove.mutate(s)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      }

      <NewStoryDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function MediaThumb({ story }: { story: Story }) {
  const { data } = useQuery({
    queryKey: ["story-signed", story.id],
    queryFn: async () => {
      const path = story.media_url.replace(/^stories\//, "");
      const { data } = await supabase.storage.from("stories").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
  });
  if (!data) return <div className="h-28 w-20 animate-pulse rounded-lg bg-muted" />;
  return story.media_type === "video"
    ? <video src={data} className="h-28 w-20 rounded-lg object-cover" muted />
    : <img src={data} className="h-28 w-20 rounded-lg object-cover" alt={story.caption ?? ""} />;
}

function NewStoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [dogId, setDogId] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: dogs = [] } = useQuery({
    queryKey: ["dogs-stories"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("dogs").select("id,name,tutor:tutors(full_name)").order("name");
      return (data ?? []) as Array<{ id: string; name: string; tutor: { full_name: string }|null }>;
    },
  });

  async function handleSave() {
    if (!dogId || !file) return toast.error("Selecione cão e arquivo");
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${dogId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("stories").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: u } = await supabase.auth.getUser();
      const isVideo = file.type.startsWith("video/");
      const { error } = await supabase.from("dog_stories").insert({
        dog_id: dogId,
        media_url: `stories/${path}`,
        media_type: isVideo ? "video" : "photo",
        caption: caption.trim() || null,
        created_by: u.user?.id,
      });
      if (error) throw error;
      toast.success("Story publicado");
      qc.invalidateQueries({ queryKey: ["stories-all"] });
      setDogId(""); setCaption(""); setFile(null);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo story</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cão</Label>
            <Select value={dogId} onValueChange={setDogId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {dogs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}{d.tutor?.full_name ? ` · ${d.tutor.full_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Foto ou vídeo</Label>
            <Input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>Legenda (opcional)</Label>
            <Textarea rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Upload className="mr-1 h-4 w-4" />{saving ? "Enviando…" : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
