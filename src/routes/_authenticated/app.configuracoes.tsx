import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, Building2, Scissors } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Quintal da Gabi" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground">Unidades, capacidade e serviços oferecidos.</p>
      </header>

      <Tabs defaultValue="unidades">
        <TabsList>
          <TabsTrigger value="unidades"><Building2 className="mr-1 h-4 w-4" />Unidades</TabsTrigger>
          <TabsTrigger value="servicos"><Scissors className="mr-1 h-4 w-4" />Serviços de banho & tosa</TabsTrigger>
        </TabsList>
        <TabsContent value="unidades"><UnitsPanel /></TabsContent>
        <TabsContent value="servicos"><ServicesPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function UnitsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", address: "", phone: "" });

  const q = useQuery({
    queryKey: ["units-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*, settings:unit_settings(daycare_capacity,boarding_capacity)").order("created_at");
      if (error) throw error; return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("units").insert({ name: form.name, city: form.city || null, address: form.address || null, phone: form.phone || null }).select("id").single();
      if (error) throw error;
      await supabase.from("unit_settings").insert({ unit_id: data.id, daycare_capacity: 20, boarding_capacity: 10 });
    },
    onSuccess: () => { toast.success("Unidade criada"); setOpen(false); setForm({ name: "", city: "", address: "", phone: "" }); qc.invalidateQueries({ queryKey: ["units-config"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateUnit = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => { const { error } = await supabase.from("units").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units-config"] }),
  });

  const updateCap = useMutation({
    mutationFn: async ({ unit_id, daycare, boarding }: { unit_id: string; daycare: number; boarding: number }) => {
      const { error } = await supabase.from("unit_settings").upsert({ unit_id, daycare_capacity: daycare, boarding_capacity: boarding }, { onConflict: "unit_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Capacidade salva"); qc.invalidateQueries({ queryKey: ["units-config"] }); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Unidades</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Nova unidade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova unidade</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending || !form.name}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {(q.data ?? []).map((u: any) => {
          const s = (u.settings && u.settings[0]) || {};
          return (
            <div key={u.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{u.name} <span className="text-xs text-muted-foreground">{u.city}</span></p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Ativa</Label>
                  <Switch checked={u.is_active} onCheckedChange={(v) => updateUnit.mutate({ id: u.id, patch: { is_active: v } })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div><Label className="text-xs">Endereço</Label><Input defaultValue={u.address ?? ""} onBlur={(e) => e.target.value !== (u.address ?? "") && updateUnit.mutate({ id: u.id, patch: { address: e.target.value || null } })} /></div>
                <div><Label className="text-xs">Telefone</Label><Input defaultValue={u.phone ?? ""} onBlur={(e) => e.target.value !== (u.phone ?? "") && updateUnit.mutate({ id: u.id, patch: { phone: e.target.value || null } })} /></div>
                <CapacityInput label="Capacidade creche" defaultValue={s.daycare_capacity ?? 20} onSave={(v) => updateCap.mutate({ unit_id: u.id, daycare: v, boarding: s.boarding_capacity ?? 10 })} />
                <CapacityInput label="Capacidade hospedagem" defaultValue={s.boarding_capacity ?? 10} onSave={(v) => updateCap.mutate({ unit_id: u.id, daycare: s.daycare_capacity ?? 20, boarding: v })} />
              </div>
            </div>
          );
        })}
        {(q.data ?? []).length === 0 && <p className="text-muted-foreground">Nenhuma unidade.</p>}
      </CardContent>
    </Card>
  );
}

function CapacityInput({ label, defaultValue, onSave }: { label: string; defaultValue: number; onSave: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} defaultValue={defaultValue} onBlur={(e) => { const v = Number(e.target.value); if (v !== defaultValue) onSave(v); }} />
    </div>
  );
}

function ServicesPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", duration_min: "60", base_price: "0" });

  const q = useQuery({
    queryKey: ["grooming-services"],
    queryFn: async () => { const { data, error } = await supabase.from("grooming_services").select("*").order("name"); if (error) throw error; return data ?? []; },
  });

  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("grooming_services").insert({ name: form.name, duration_min: Number(form.duration_min), base_price: Number(form.base_price), is_active: true }); if (error) throw error; },
    onSuccess: () => { toast.success("Serviço criado"); setOpen(false); setForm({ name: "", duration_min: "60", base_price: "0" }); qc.invalidateQueries({ queryKey: ["grooming-services"] }); },
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => { const { error } = await supabase.from("grooming_services").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grooming-services"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("grooming_services").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grooming-services"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Serviços de banho & tosa</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo serviço</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo serviço</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duração (min)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></div>
                <div><Label>Preço base (R$)</Label><Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending || !form.name}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {(q.data ?? []).length === 0 ? <p className="text-muted-foreground">Nenhum serviço cadastrado.</p> : (
          <ul className="divide-y">
            {(q.data ?? []).map((s: any) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.duration_min} min • R$ {Number(s.base_price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={s.is_active} onCheckedChange={(v) => update.mutate({ id: s.id, patch: { is_active: v } })} />
                  <Button variant="ghost" size="sm" onClick={() => del.mutate(s.id)}>Remover</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
