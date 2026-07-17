import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, Building2, Scissors, CalendarRange, Palette, ShieldCheck, History } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { CENTRALPET_BRAND, useInvalidateBrand } from "@/lib/branding";
import { resolveColor } from "@/lib/color-names";
import { validateFile, IMAGE_TYPES } from "@/lib/file-validation";

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
          {isAdmin && (
            <TabsTrigger value="lgpd"><ShieldCheck className="mr-1 h-4 w-4" />LGPD</TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="auditoria"><History className="mr-1 h-4 w-4" />Auditoria</TabsTrigger>
          )}
        </TabsList>
        {isAdmin && (
          <TabsContent value="identidade"><BrandingPanel /></TabsContent>
        )}
        <TabsContent value="unidades"><UnitsPanel /></TabsContent>
        <TabsContent value="servicos"><ServicesPanel /></TabsContent>
        <TabsContent value="pacotes"><DaycarePackagesPanel /></TabsContent>
        {isAdmin && (
          <TabsContent value="lgpd"><LgpdPanel /></TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="auditoria"><AuditLogPanel /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function BrandingPanel() {
  const qc = useQueryClient();
  const invalidateBrand = useInvalidateBrand();

  const q = useQuery({
    queryKey: ["company-branding-config"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user?.id ?? "")
        .maybeSingle();
      const companyId = (profile as { company_id?: string | null } | null)?.company_id;
      if (!companyId) return null;
      const { data, error } = await (supabase as any)
        .from("companies")
        .select("id, name, logo_url, primary_color, secondary_color, accent_color, background_color")
        .eq("id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Record<string, string | null>) => {
      if (!q.data?.id) throw new Error("Empresa não encontrada");
      const { error } = await (supabase as any).from("companies").update(patch).eq("id", q.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Identidade visual atualizada");
      qc.invalidateQueries({ queryKey: ["company-branding-config"] });
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
          administradores, funcionários e tutores da sua empresa — em todas as unidades.
          Cada empresa mantém a sua própria identidade; o padrão Central Pet é usado até
          você personalizar.
        </p>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : q.isError ? (
          <p className="text-destructive">
            Não foi possível carregar a identidade visual: {(q.error as any)?.message ?? "erro desconhecido"}.
          </p>
        ) : q.data ? (
          <BrandingRow company={q.data} saving={save.isPending} onSave={(patch) => save.mutate(patch)} />
        ) : (
          <p className="text-destructive">
            Sua conta ainda não está vinculada a nenhuma empresa, então não é possível
            personalizar a identidade visual. Fale com o suporte para vincular sua conta a
            uma empresa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BrandingRow({
  company,
  onSave,
  saving,
}: {
  company: any;
  onSave: (patch: Record<string, string | null>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState<string>(company.name ?? "");
  const [logo, setLogo] = useState<string>(company.logo_url ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [primary, setPrimary] = useState<string>(company.primary_color ?? CENTRALPET_BRAND.primary);
  const [secondary, setSecondary] = useState<string>(company.secondary_color ?? CENTRALPET_BRAND.secondary);
  const [accent, setAccent] = useState<string>(company.accent_color ?? CENTRALPET_BRAND.accent);
  const [background, setBackground] = useState<string>(company.background_color ?? "");

  function handleSave() {
    onSave({
      name: name.trim() || CENTRALPET_BRAND.name,
      logo_url: logo.trim() || null,
      primary_color: primary || null,
      secondary_color: secondary || null,
      accent_color: accent || null,
      background_color: background.trim() ? (resolveColor(background) ?? background) : null,
    });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const invalid = validateFile(file, { maxSizeMB: 3, allowedTypes: [...IMAGE_TYPES, "image/svg+xml"] });
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${company.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("branding").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      setLogo(data.publicUrl);
      toast.success("Logo enviado — clique em Salvar para confirmar.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar o logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleReset() {
    setName("");
    setLogo("");
    setPrimary(CENTRALPET_BRAND.primary);
    setSecondary(CENTRALPET_BRAND.secondary);
    setAccent(CENTRALPET_BRAND.accent);
    setBackground("");
    onSave({
      name: CENTRALPET_BRAND.name,
      logo_url: null,
      primary_color: CENTRALPET_BRAND.primary,
      secondary_color: CENTRALPET_BRAND.secondary,
      accent_color: CENTRALPET_BRAND.accent,
      background_color: null,
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">

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
          <Label className="text-xs">Logo</Label>
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="Logo" className="h-12 w-12 rounded-lg border object-contain p-1" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border text-[10px] text-muted-foreground">
                Sem logo
              </div>
            )}
            <label>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {logo ? "Trocar logo" : "Enviar logo"}
              </span>
            </label>
            {logo && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLogo("")}>
                Remover
              </Button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">PNG, JPG, WEBP ou SVG, até 3MB.</p>
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
  allowEmpty = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const resolved = text.trim() ? resolveColor(text) : null;
  const swatch = resolved ?? (value && /^#/.test(value) ? value : "#e5e7eb");
  const isUnknown = text.trim().length > 0 && resolved === null && !/^#([0-9a-f]{6})$/i.test(text.trim());

  function commit(v: string) {
    const trimmed = v.trim();
    if (!trimmed) {
      if (allowEmpty) onChange("");
      return;
    }
    const hex = resolveColor(trimmed);
    if (hex) onChange(hex);
    else if (/^#([0-9a-f]{6})$/i.test(trimmed)) onChange(trimmed.toUpperCase());
    // se não reconhecer, mantém o valor salvo anterior; UI mostra o aviso
  }

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Selecionar ${label.toLowerCase()} visualmente`}
          value={/^#([0-9a-f]{6})$/i.test(swatch) ? swatch : "#e5e7eb"}
          onChange={(e) => {
            setText(e.target.value.toUpperCase());
            commit(e.target.value);
          }}
          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0"
        />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="ex.: azul marinho, verde água, #FF7F50"
        />
      </div>
      {isUnknown && (
        <p className="mt-1 text-[11px] text-destructive">
          Cor "{text}" não reconhecida. Tente um nome em português (ex.: <em>azul marinho</em>) ou um código hex (<code>#123ABC</code>).
        </p>
      )}
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
        <div><Label className="text-xs">E-mail</Label>
          <Input type="email" defaultValue={unit.email ?? ""} onBlur={(e) => e.target.value !== (unit.email ?? "") && onSaveUnit({ email: e.target.value || null })} /></div>
        <div><Label className="text-xs">Horário de funcionamento</Label>
          <Input placeholder="Ex.: Seg-Sex 07h-19h, Sáb 08h-12h" defaultValue={unit.opening_hours ?? ""} onBlur={(e) => e.target.value !== (unit.opening_hours ?? "") && onSaveUnit({ opening_hours: e.target.value || null })} /></div>
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

const SIZES: { v: string; l: string }[] = [
  { v: "pequeno", l: "Pequeno" },
  { v: "medio", l: "Médio" },
  { v: "grande", l: "Grande" },
];

function ServicesPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    duration_min: "60",
    base_price: "0",
    sizes: ["pequeno", "medio", "grande"] as string[],
  });

  const q = useQuery({
    queryKey: ["grooming-services"],
    queryFn: async () => { const { data, error } = await supabase.from("grooming_services").select("*").order("name"); if (error) throw error; return data ?? []; },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("grooming_services").insert({
        name: form.name,
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        duration_min: Number(form.duration_min),
        base_price: Number(form.base_price),
        sizes: form.sizes.length ? form.sizes : ["pequeno", "medio", "grande"],
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço criado");
      setOpen(false);
      setForm({ name: "", category: "", description: "", duration_min: "60", base_price: "0", sizes: ["pequeno", "medio", "grande"] });
      qc.invalidateQueries({ queryKey: ["grooming-services"] });
    },
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
                <div><Label>Categoria</Label><Input placeholder="Ex.: Banho, Tosa, Spa" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div><Label>Duração (min)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></div>
              </div>
              <div><Label>Descrição</Label><Input placeholder="Detalhes do serviço" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Porte permitido</Label>
                <div className="mt-1 flex flex-wrap gap-3">
                  {SIZES.map((s) => (
                    <label key={s.v} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={form.sizes.includes(s.v)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            sizes: e.target.checked ? [...f.sizes, s.v] : f.sizes.filter((x) => x !== s.v),
                          }))
                        }
                      />
                      {s.l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <p className="font-medium">{s.name}{s.category ? <span className="ml-2 text-xs font-normal text-muted-foreground">({s.category})</span> : null}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.duration_min} min • R$ {Number(s.base_price).toFixed(2)}
                    {s.sizes?.length ? ` • Porte: ${s.sizes.map((v: string) => SIZES.find((x) => x.v === v)?.l ?? v).join(", ")}` : ""}
                  </p>
                  {s.description ? <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p> : null}
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

  const [openAvulso, setOpenAvulso] = useState(false);
  const [formAvulso, setFormAvulso] = useState({ name: "", total_days: "10", validity_days: "60", price: "0", description: "" });

  const [sellDog, setSellDog] = useState("");
  const [sellPkg, setSellPkg] = useState("");

  const pkgsQ = useQuery({
    queryKey: ["daycare-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("daycare_packages").select("*").order("days_per_week");
      if (error) throw error; return data ?? [];
    },
  });
  const semanalPkgs = (pkgsQ.data ?? []).filter((p: any) => p.package_type !== "avulso");
  const avulsoPkgs = (pkgsQ.data ?? []).filter((p: any) => p.package_type === "avulso");

  const dogsQ = useQuery({
    queryKey: ["dogs-pkg-assign"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dogs").select("id,name,daycare_package_id,tutor:tutors(full_name)").order("name");
      if (error) throw error; return data ?? [];
    },
  });

  const purchasesQ = useQuery({
    queryKey: ["daycare-package-purchases"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("daycare_package_purchases")
        .select("*, dog:dogs(name), package:daycare_packages(name)")
        .order("purchased_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daycare_packages").insert({
        name: form.name,
        package_type: "semanal",
        days_per_week: Number(form.days_per_week),
        monthly_price: Number(form.monthly_price),
        extra_day_price: Number(form.extra_day_price),
        is_active: true,
      } as any);
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
    onError: (e: any) => toast.error(e.message),
  });

  const createAvulso = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daycare_packages").insert({
        name: formAvulso.name,
        package_type: "avulso",
        total_days: Number(formAvulso.total_days),
        validity_days: Number(formAvulso.validity_days),
        monthly_price: Number(formAvulso.price),
        description: formAvulso.description.trim() || null,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pacote avulso criado");
      setOpenAvulso(false);
      setFormAvulso({ name: "", total_days: "10", validity_days: "60", price: "0", description: "" });
      qc.invalidateQueries({ queryKey: ["daycare-packages"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignDog = useMutation({
    mutationFn: async ({ dog_id, daycare_package_id }: { dog_id: string; daycare_package_id: string | null }) => {
      const { error } = await supabase.from("dogs").update({ daycare_package_id }).eq("id", dog_id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pacote vinculado"); qc.invalidateQueries({ queryKey: ["dogs-pkg-assign"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sellPackage = useMutation({
    mutationFn: async () => {
      const pkg = avulsoPkgs.find((p: any) => p.id === sellPkg) as any;
      if (!pkg || !sellDog) throw new Error("Escolha o cão e o pacote");
      const { error } = await (supabase as any).from("daycare_package_purchases").insert({
        dog_id: sellDog,
        package_id: pkg.id,
        total_days: pkg.total_days,
        expires_at: new Date(Date.now() + pkg.validity_days * 86400000).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pacote avulso vendido para o cão");
      setSellDog(""); setSellPkg("");
      qc.invalidateQueries({ queryKey: ["daycare-package-purchases"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delPurchase = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("daycare_package_purchases").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Registro excluído"); qc.invalidateQueries({ queryKey: ["daycare-package-purchases"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pacotes semanais (mensalidade recorrente)</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo pacote</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo pacote semanal</DialogTitle></DialogHeader>
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
          {semanalPkgs.length === 0 ? <p className="text-muted-foreground">Nenhum pacote cadastrado.</p> : (
            <ul className="divide-y">
              {semanalPkgs.map((p: any) => (
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pacotes avulsos (diárias com validade)</CardTitle>
          <Dialog open={openAvulso} onOpenChange={setOpenAvulso}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" />Novo pacote avulso</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo pacote avulso</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Nome *</Label><Input value={formAvulso.name} onChange={(e) => setFormAvulso({ ...formAvulso, name: e.target.value })} placeholder="Ex: 10 diárias" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Quantidade de diárias</Label><Input type="number" min={1} value={formAvulso.total_days} onChange={(e) => setFormAvulso({ ...formAvulso, total_days: e.target.value })} /></div>
                  <div><Label>Validade (dias)</Label><Input type="number" min={1} value={formAvulso.validity_days} onChange={(e) => setFormAvulso({ ...formAvulso, validity_days: e.target.value })} /></div>
                  <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={formAvulso.price} onChange={(e) => setFormAvulso({ ...formAvulso, price: e.target.value })} /></div>
                </div>
                <div><Label>Descrição</Label><Input value={formAvulso.description} onChange={(e) => setFormAvulso({ ...formAvulso, description: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={() => createAvulso.mutate()} disabled={createAvulso.isPending || !formAvulso.name}>{createAvulso.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {avulsoPkgs.length === 0 ? <p className="text-muted-foreground">Nenhum pacote avulso cadastrado.</p> : (
            <ul className="divide-y">
              {avulsoPkgs.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.total_days} diárias • válido {p.validity_days} dias • R$ {Number(p.monthly_price).toFixed(2)}
                    </p>
                    {p.description ? <p className="text-xs text-muted-foreground">{p.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_active} onCheckedChange={(v) => update.mutate({ id: p.id, patch: { is_active: v } })} />
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover pacote?")) del.mutate(p.id); }}>Remover</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Vender pacote avulso para um cão</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="text-xs">Cão</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={sellDog} onChange={(e) => setSellDog(e.target.value)}>
              <option value="">Selecione o cão</option>
              {(dogsQ.data ?? []).map((d: any) => (
                <option key={d.id} value={d.id}>{d.name} — {d.tutor?.full_name ?? "—"}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <Label className="text-xs">Pacote avulso</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={sellPkg} onChange={(e) => setSellPkg(e.target.value)}>
              <option value="">Selecione o pacote</option>
              {avulsoPkgs.filter((p: any) => p.is_active).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} — {p.total_days} diárias — R$ {Number(p.monthly_price).toFixed(2)}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => sellPackage.mutate()} disabled={sellPackage.isPending || !sellDog || !sellPkg}>
            {sellPackage.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Vender
          </Button>
        </CardContent>
      </Card>

      {(purchasesQ.data ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pacotes avulsos vendidos</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {(purchasesQ.data ?? []).map((pu: any) => {
                const expired = new Date(pu.expires_at) < new Date();
                const remaining = pu.total_days - pu.days_used;
                return (
                  <li key={pu.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium">{pu.dog?.name} — {pu.package?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {remaining} de {pu.total_days} diárias restantes • vence em {new Date(pu.expires_at).toLocaleDateString("pt-BR")}
                        {expired ? " • vencido" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{expired ? "vencido" : pu.status}</span>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir esta venda de pacote?")) delPurchase.mutate(pu.id); }}>Remover</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Pacote semanal por cão</CardTitle></CardHeader>
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
                    <option value="">Sem pacote (diária avulsa sem vínculo)</option>
                    {semanalPkgs.filter((p: any) => p.is_active).map((p: any) => (
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

const REQUEST_TYPE_LABEL: Record<string, string> = { export: "Exportação de dados", delete: "Exclusão de conta" };
const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando", in_review: "Em análise", completed: "Concluída", rejected: "Recusada",
};

function LgpdPanel() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["lgpd-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("data_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("data_requests")
        .update({ status, resolved_at: status === "completed" || status === "rejected" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["lgpd-requests"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = (q.data ?? []).filter((r: any) => r.status === "pending" || r.status === "in_review");
  const resolved = (q.data ?? []).filter((r: any) => r.status === "completed" || r.status === "rejected");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Solicitações de dados (LGPD)
          </CardTitle>
          <CardDescription>
            Pedidos de exportação ou exclusão de dados feitos pelos próprios tutores/funcionários. A lei dá até
            15 dias para responder. Exclusões não são automáticas — revise se há obrigação legal de manter
            algum registro (ex.: financeiro) antes de excluir de verdade a conta no Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma solicitação pendente.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((r: any) => (
                <div key={r.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {r.requester_name ?? "—"} · {r.requester_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pedido em {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      {r.notes && <p className="mt-1 text-sm">"{r.notes}"</p>}
                    </div>
                    <Badge variant="secondary">{STATUS_LABEL[r.status]}</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: "completed" })}>
                      Marcar como concluída
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "in_review" })}>
                      Em análise
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}>
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {resolved.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {resolved.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}</p>
                  <p className="text-xs text-muted-foreground">{r.requester_email}</p>
                </div>
                <Badge variant={r.status === "completed" ? "default" : "destructive"}>{STATUS_LABEL[r.status]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const AUDIT_TABLE_LABEL: Record<string, string> = {
  financial_transactions: "Financeiro",
  occurrences: "Ocorrências",
  arrival_notifications: "Chegadas",
  dogs: "Cães",
  tutors: "Tutores",
  employees: "Funcionários",
  daycare_packages: "Pacotes de creche",
  daycare_package_purchases: "Venda de pacote avulso",
  documents: "Documentos",
  companies: "Identidade visual / assinatura",
  user_roles: "Permissões",
};

const AUDIT_ACTION_LABEL: Record<string, string> = {
  create: "Criado",
  update: "Editado",
  delete: "Excluído",
  login: "Login",
  logout: "Logout",
  password_change: "Trocou a senha",
};

const AUDIT_ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  login: "outline",
  logout: "outline",
  password_change: "secondary",
};

function AuditLogPanel() {
  const [tableFilter, setTableFilter] = useState<string>("todas");
  const [actionFilter, setActionFilter] = useState<string>("todas");

  const q = useQuery({
    queryKey: ["audit-log", tableFilter, actionFilter],
    queryFn: async () => {
      let qb = (supabase as any).from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (tableFilter !== "todas") qb = qb.eq("table_name", tableFilter);
      if (actionFilter !== "todas") qb = qb.eq("action", actionFilter);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Log de auditoria
        </CardTitle>
        <CardDescription>
          Registro automático de quem fez o quê e quando: criação, edição e exclusão nas áreas mais
          sensíveis (financeiro, ocorrências, chegadas, cães, tutores, funcionários, pacotes, documentos,
          identidade visual, permissões), além de login, logout e troca de senha de qualquer usuário. Só
          admin consegue ver este histórico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex flex-wrap gap-2">
          <Button size="sm" variant={actionFilter === "todas" ? "default" : "outline"} onClick={() => setActionFilter("todas")}>
            Todas as ações
          </Button>
          {Object.entries(AUDIT_ACTION_LABEL).map(([key, label]) => (
            <Button key={key} size="sm" variant={actionFilter === key ? "default" : "outline"} onClick={() => setActionFilter(key)}>
              {label}
            </Button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-2 border-t pt-2">
          <Button size="sm" variant={tableFilter === "todas" ? "default" : "outline"} onClick={() => setTableFilter("todas")}>
            Todas as áreas
          </Button>
          {Object.entries(AUDIT_TABLE_LABEL).map(([key, label]) => (
            <Button key={key} size="sm" variant={tableFilter === key ? "default" : "outline"} onClick={() => setTableFilter(key)}>
              {label}
            </Button>
          ))}
        </div>

        {q.isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : (q.data ?? []).length === 0 ? (
          <p className="text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {(q.data ?? []).map((r: any) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {r.table_name ? (AUDIT_TABLE_LABEL[r.table_name] ?? r.table_name) : "Conta"}
                    {r.record_summary ? ` — "${r.record_summary}"` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.actor_email ?? "—"} em {new Date(r.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge variant={AUDIT_ACTION_VARIANT[r.action] ?? "outline"}>
                  {AUDIT_ACTION_LABEL[r.action] ?? r.action}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
