import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, Building2, Scissors, CalendarRange, Palette } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { CENTRALPET_BRAND, useInvalidateBrand } from "@/lib/branding";
import { resolveColor } from "@/lib/color-names";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Central Pet" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.roles.includes("admin") ?? false;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground">Unidades, capacidade, serviços e identidade visual.</p>
      </header>

      <Tabs defaultValue={isAdmin ? "identidade" : "unidades"}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="identidade"><Palette className="mr-1 h-4 w-4" />Identidade visual</TabsTrigger>
          )}
          <TabsTrigger value="unidades"><Building2 className="mr-1 h-4 w-4" />Unidades</TabsTrigger>
          <TabsTrigger value="servicos"><Scissors className="mr-1 h-4 w-4" />Serviços de banho & tosa</TabsTrigger>
          <TabsTrigger value="pacotes"><CalendarRange className="mr-1 h-4 w-4" />Pacotes de creche</TabsTrigger>
        </TabsList>
        {isAdmin && (
          <TabsContent value="identidade"><BrandingPanel /></TabsContent>
        )}
        <TabsContent value="unidades"><UnitsPanel /></TabsContent>
        <TabsContent value="servicos"><ServicesPanel /></TabsContent>
        <TabsContent value="pacotes"><DaycarePackagesPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function BrandingPanel() {
  const qc = useQueryClient();
  const invalidateBrand = useInvalidateBrand();

  const q = useQuery({
    queryKey: ["units-branding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, name, brand_name, brand_logo_url, brand_primary, brand_secondary, brand_accent")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, string | null> }) => {
      const { error } = await supabase.from("units").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Identidade visual atualizada");
      qc.invalidateQueries({ queryKey: ["units-branding"] });
      invalidateBrand();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identidade visual da empresa</CardTitle>
        <p className="text-sm text-muted-foreground">
          Personalize nome, logo e cores. As alterações são aplicadas automaticamente para
          administradores, funcionários e tutores da sua empresa. Cada empresa mantém a sua
          própria identidade — o padrão Central Pet é usado até você personalizar.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {(q.data ?? []).map((u: any) => (
          <BrandingRow
            key={u.id}
            unit={u}
            saving={save.isPending}
            onSave={(patch) => save.mutate({ id: u.id, patch })}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function BrandingRow({
  unit,
  onSave,
  saving,
}: {
  unit: any;
  onSave: (patch: Record<string, string | null>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState<string>(unit.brand_name ?? "");
  const [logo, setLogo] = useState<string>(unit.brand_logo_url ?? "");
  const [primary, setPrimary] = useState<string>(unit.brand_primary ?? CENTRALPET_BRAND.primary);
  const [secondary, setSecondary] = useState<string>(unit.brand_secondary ?? CENTRALPET_BRAND.secondary);
  const [accent, setAccent] = useState<string>(unit.brand_accent ?? CENTRALPET_BRAND.accent);
  const [background, setBackground] = useState<string>(unit.brand_background ?? "");

  function handleSave() {
    onSave({
      brand_name: name.trim() || null,
      brand_logo_url: logo.trim() || null,
      brand_primary: primary || null,
      brand_secondary: secondary || null,
      brand_accent: accent || null,
      brand_background: background.trim() ? (resolveColor(background) ?? background) : null,
    });
  }

  function handleReset() {
    setName("");
    setLogo("");
    setPrimary(CENTRALPET_BRAND.primary);
    setSecondary(CENTRALPET_BRAND.secondary);
    setAccent(CENTRALPET_BRAND.accent);
    setBackground("");
    onSave({
      brand_name: null,
      brand_logo_url: null,
      brand_primary: null,
      brand_secondary: null,
      brand_accent: null,
      brand_background: null,
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm font-medium text-muted-foreground">{unit.name}</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Nome da empresa</Label>
          <Input
            value={name}
            placeholder={CENTRALPET_BRAND.name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Logo (URL)</Label>
          <Input
            value={logo}
            placeholder="https://.../logo.png"
            onChange={(e) => setLogo(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <ColorField label="Cor primária" value={primary} onChange={setPrimary} />
        <ColorField label="Cor secundária" value={secondary} onChange={setSecondary} />
        <ColorField label="Cor de destaque" value={accent} onChange={setAccent} />
        <ColorField label="Cor de fundo" value={background} onChange={setBackground} allowEmpty />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Você pode digitar o nome da cor em português (ex.: <em>azul marinho</em>, <em>verde água</em>,
        <em>rosa antigo</em>, <em>bege</em>) ou o código hex (<code>#3B82F6</code>).
      </p>

      <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
        {logo ? (
          <img src={logo} alt="Prévia do logo" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span
            className="grid h-10 w-10 place-items-center rounded-full text-white"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
          >
            🐾
          </span>
        )}
        <span className="font-display text-lg font-semibold" style={{ color: primary }}>
          {name || CENTRALPET_BRAND.name}
        </span>
        <span
          className="ml-auto rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ background: accent }}
        >
          Prévia
        </span>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleReset} disabled={saving}>
          Restaurar padrão Central Pet
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Salvar identidade visual
        </Button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#FF7F50" />
      </div>
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
    onSuccess: () => {
      toast.success("Capacidade salva");
      qc.invalidateQueries({ queryKey: ["units-config"] });
      qc.invalidateQueries({ queryKey: ["inteligencia-financeira-unit-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Unidade</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {(q.data ?? []).map((u: any) => {
          const s = (u.settings && u.settings[0]) || {};
          return (
            <UnitRow
              key={u.id}
              unit={u}
              daycareValue={s.daycare_capacity ?? 20}
              boardingValue={s.boarding_capacity ?? 10}
              onSaveUnit={(patch) => updateUnit.mutate({ id: u.id, patch })}
              onSaveCap={(d, b) => updateCap.mutate({ unit_id: u.id, daycare: d, boarding: b })}
              saving={updateCap.isPending}
            />
          );
        })}
        {(q.data ?? []).length === 0 && <p className="text-muted-foreground">Nenhuma unidade.</p>}
      </CardContent>
    </Card>
  );
}

function UnitRow({ unit, daycareValue, boardingValue, onSaveUnit, onSaveCap, saving }: {
  unit: any;
  daycareValue: number;
  boardingValue: number;
  onSaveUnit: (patch: any) => void;
  onSaveCap: (d: number, b: number) => void;
  saving: boolean;
}) {
  const [daycare, setDaycare] = useState<string>(String(daycareValue));
  const [boarding, setBoarding] = useState<string>(String(boardingValue));

  // Atualiza quando o servidor devolver novo valor
  // (mas só se o usuário não estiver editando)
  // Aqui simplesmente sincroniza ao mudar prop:
  useEffectSync(daycareValue, setDaycare);
  useEffectSync(boardingValue, setBoarding);

  const dirty = Number(daycare) !== daycareValue || Number(boarding) !== boardingValue;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{unit.name} <span className="text-xs text-muted-foreground">{unit.city}</span></p>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Ativa</Label>
          <Switch checked={unit.is_active} onCheckedChange={(v) => onSaveUnit({ is_active: v })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div><Label className="text-xs">Endereço</Label>
          <Input defaultValue={unit.address ?? ""} onBlur={(e) => e.target.value !== (unit.address ?? "") && onSaveUnit({ address: e.target.value || null })} /></div>
        <div><Label className="text-xs">Telefone</Label>
          <Input defaultValue={unit.phone ?? ""} onBlur={(e) => e.target.value !== (unit.phone ?? "") && onSaveUnit({ phone: e.target.value || null })} /></div>
        <div>
          <Label className="text-xs">Capacidade creche</Label>
          <Input type="number" min={0} value={daycare} onChange={(e) => setDaycare(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Capacidade hospedagem</Label>
          <Input type="number" min={0} value={boarding} onChange={(e) => setBoarding(e.target.value)} />
        </div>
      </div>
      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => onSaveCap(Number(daycare) || 0, Number(boarding) || 0)} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Salvar capacidade
          </Button>
        </div>
      )}
    </div>
  );
}

function useEffectSync(value: number, setter: (v: string) => void) {
  // Hook auxiliar para resync defaults
  const ref = useRef(value);
  useEffect(() => {
    if (ref.current !== value) {
      ref.current = value;
      setter(String(value));
    }
  }, [value, setter]);
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

function DaycarePackagesPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", days_per_week: "3", monthly_price: "0", extra_day_price: "0" });

  const pkgsQ = useQuery({
    queryKey: ["daycare-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("daycare_packages").select("*").order("days_per_week");
      if (error) throw error; return data ?? [];
    },
  });

  const dogsQ = useQuery({
    queryKey: ["dogs-pkg-assign"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dogs").select("id,name,daycare_package_id,tutor:tutors(full_name)").order("name");
      if (error) throw error; return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daycare_packages").insert({
        name: form.name,
        days_per_week: Number(form.days_per_week),
        monthly_price: Number(form.monthly_price),
        extra_day_price: Number(form.extra_day_price),
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pacote criado"); setOpen(false); setForm({ name: "", days_per_week: "3", monthly_price: "0", extra_day_price: "0" }); qc.invalidateQueries({ queryKey: ["daycare-packages"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => { const { error } = await supabase.from("daycare_packages").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daycare-packages"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("daycare_packages").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daycare-packages"] }),
  });
  const assignDog = useMutation({
    mutationFn: async ({ dog_id, daycare_package_id }: { dog_id: string; daycare_package_id: string | null }) => {
      const { error } = await supabase.from("dogs").update({ daycare_package_id }).eq("id", dog_id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pacote vinculado"); qc.invalidateQueries({ queryKey: ["dogs-pkg-assign"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pacotes mensais de creche</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo pacote</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo pacote</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: 3x na semana" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Dias/semana</Label><Input type="number" min={1} max={7} value={form.days_per_week} onChange={(e) => setForm({ ...form, days_per_week: e.target.value })} /></div>
                  <div><Label>Mensalidade (R$)</Label><Input type="number" step="0.01" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} /></div>
                  <div><Label>Dia extra (R$)</Label><Input type="number" step="0.01" value={form.extra_day_price} onChange={(e) => setForm({ ...form, extra_day_price: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending || !form.name}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(pkgsQ.data ?? []).length === 0 ? <p className="text-muted-foreground">Nenhum pacote cadastrado.</p> : (
            <ul className="divide-y">
              {(pkgsQ.data ?? []).map((p: any) => (
                <li key={p.id} className="grid grid-cols-1 items-center gap-2 py-2 sm:grid-cols-[1fr_90px_120px_120px_auto]">
                  <Input defaultValue={p.name} onBlur={(e) => e.target.value !== p.name && update.mutate({ id: p.id, patch: { name: e.target.value } })} />
                  <Input type="number" min={1} max={7} defaultValue={p.days_per_week} onBlur={(e) => Number(e.target.value) !== p.days_per_week && update.mutate({ id: p.id, patch: { days_per_week: Number(e.target.value) } })} />
                  <Input type="number" step="0.01" defaultValue={p.monthly_price} onBlur={(e) => Number(e.target.value) !== Number(p.monthly_price) && update.mutate({ id: p.id, patch: { monthly_price: Number(e.target.value) } })} />
                  <Input type="number" step="0.01" defaultValue={p.extra_day_price} onBlur={(e) => Number(e.target.value) !== Number(p.extra_day_price) && update.mutate({ id: p.id, patch: { extra_day_price: Number(e.target.value) } })} />
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_active} onCheckedChange={(v) => update.mutate({ id: p.id, patch: { is_active: v } })} />
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover pacote?")) del.mutate(p.id); }}>Remover</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">A mensalidade é cobrada automaticamente no primeiro check-out do mês. Dias acima da franquia (dias/semana × 4) geram cobrança de dia extra.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pacote por cão</CardTitle></CardHeader>
        <CardContent>
          {(dogsQ.data ?? []).length === 0 ? <p className="text-muted-foreground">Nenhum cão cadastrado.</p> : (
            <ul className="divide-y">
              {(dogsQ.data ?? []).map((d: any) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.tutor?.full_name ?? "—"}</p>
                  </div>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={d.daycare_package_id ?? ""}
                    onChange={(e) => assignDog.mutate({ dog_id: d.id, daycare_package_id: e.target.value || null })}
                  >
                    <option value="">Sem pacote (diária avulsa)</option>
                    {(pkgsQ.data ?? []).filter((p: any) => p.is_active).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} — R$ {Number(p.monthly_price).toFixed(2)}/mês</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
