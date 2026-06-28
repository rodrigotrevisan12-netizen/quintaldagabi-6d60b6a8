import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserPlus, Loader2, Link2, ShieldOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { inviteEmployee } from "@/lib/employees.functions";
import { getPasswordSetupLink, revokeEmployeeAccess } from "@/lib/access.functions";
import { useCanDelete } from "@/hooks/use-can-delete";

export const Route = createFileRoute("/_authenticated/app/funcionarios")({
  head: () => ({ meta: [{ title: "Funcionários — Quintal da Gabi" }] }),
  component: Employees,
});

const ROLES = [
  { v: "tosador", label: "Tosador(a)", perms: { banho_tosa: true, agenda: true, programacao: true } },
  { v: "banhista", label: "Banhista", perms: { banho_tosa: true, programacao: true } },
  { v: "recepcionista", label: "Recepcionista", perms: { agenda: true, tutores: true, chegadas: true, programacao: true } },
  { v: "cuidador", label: "Cuidador(a)", perms: { agenda: true, hospedagem: true, programacao: true, boletins: true } },
  { v: "gerente", label: "Gerente", perms: { agenda: true, tutores: true, hospedagem: true, banho_tosa: true, programacao: true, boletins: true, documentos: true, financeiro: true } },
  { v: "veterinario", label: "Veterinário(a)", perms: { saude: true, caes: true } },
  { v: "outro", label: "Outro", perms: {} },
] as const;

const MODULES = ["agenda", "programacao", "tutores", "caes", "hospedagem", "banho_tosa", "boletins", "documentos", "financeiro", "saude", "chegadas"];

type Emp = any;

function Employees() {
  const qc = useQueryClient();
  const canDelete = useCanDelete();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Emp | null>(null);
  const invite = useServerFn(inviteEmployee);
  const copyLink = useServerFn(getPasswordSetupLink);
  const revoke = useServerFn(revokeEmployeeAccess);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const { data: list } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await supabase.from("employees").select("*").order("full_name")).data ?? [],
  });

  function emptyForm() {
    return { full_name: "", job_role: "outro", phone: "", email: "", hired_at: "", active: true, permissions: {}, notes: "" };
  }
  const [form, setForm] = useState<any>(emptyForm());

  function startEdit(e: Emp | null) {
    setEditing(e);
    setForm(e ? { ...e, hired_at: e.hired_at ?? "" } : emptyForm());
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, hired_at: form.hired_at || null };
      if (editing) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editing.id);
        if (error) throw error;
        // Se tem email e ainda não tem acesso, cria automaticamente
        if (payload.email && !editing.user_id) {
          try {
            const r = await invite({ data: { employeeId: editing.id, email: payload.email } });
            toast.success(r.message);
          } catch (e: any) { toast.error("Salvo, mas não consegui criar acesso: " + e.message); }
        }
      } else {
        const { data, error } = await supabase.from("employees").insert(payload).select("id").single();
        if (error) throw error;
        if (payload.email && data?.id) {
          try {
            const r = await invite({ data: { employeeId: data.id, email: payload.email } });
            toast.success(r.message);
          } catch (e: any) { toast.error("Funcionário criado, mas não consegui criar acesso: " + e.message); }
        }
      }
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["employees"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("employees").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["employees"] }); },
  });

  async function resendInvite(e: Emp) {
    if (!e.email) { toast.error("Funcionário sem e-mail."); return; }
    setInvitingId(e.id);
    try {
      const r = await invite({ data: { employeeId: e.id, email: e.email } });
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) { toast.error(err.message); }
    finally { setInvitingId(null); }
  }

  async function copyPwLink(e: Emp) {
    if (!e.email) { toast.error("Sem e-mail."); return; }
    try {
      const { url } = await copyLink({ data: { email: e.email } });
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! Envie por WhatsApp para o funcionário.");
    } catch (err: any) { toast.error(err.message); }
  }

  async function revokeAccess(e: Emp) {
    if (!confirm(`Remover o acesso de ${e.full_name}? Isso apaga o login dele.`)) return;
    try {
      await revoke({ data: { employeeId: e.id } });
      toast.success("Acesso removido.");
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) { toast.error(err.message); }
  }

  function applyRolePreset(role: string) {
    const preset = ROLES.find((r) => r.v === role)?.perms ?? {};
    setForm((f: any) => ({ ...f, job_role: role, permissions: { ...preset } }));
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-semibold">Funcionários</h1>
          <p className="text-sm text-muted-foreground">Cadastro com cargo, permissões e criação automática de acesso ao app.</p></div>
        <Button onClick={() => startEdit(null)}><Plus className="mr-2 h-4 w-4" />Novo</Button>
      </header>

      <div className="grid gap-2">
        {list?.map((e: Emp) => (
          <Card key={e.id}><CardContent className="flex items-center justify-between p-4 gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">
                {e.full_name}{" "}
                {!e.active && <Badge variant="outline">inativo</Badge>}
                {e.user_id && <Badge variant="secondary" className="ml-1 text-[10px]">acesso liberado</Badge>}
              </p>
              <p className="text-xs text-muted-foreground truncate">{ROLES.find((r) => r.v === e.job_role)?.label} · {e.email ?? "—"} · {e.phone ?? "—"}</p>
            </div>
            <div className="flex flex-wrap gap-1 shrink-0">
              {e.email && (
                <Button size="sm" variant="outline" onClick={() => resendInvite(e)} disabled={invitingId === e.id}>
                  {invitingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span className="ml-1 hidden sm:inline">{e.user_id ? "Reenviar acesso" : "Criar acesso"}</span>
                </Button>
              )}
              {e.email && (
                <Button size="sm" variant="outline" onClick={() => copyPwLink(e)} title="Copiar link de definição de senha">
                  <Link2 className="h-4 w-4" /><span className="ml-1 hidden sm:inline">Copiar link</span>
                </Button>
              )}
              {e.user_id && (
                <Button size="sm" variant="outline" onClick={() => revokeAccess(e)} title="Remover acesso ao app">
                  <ShieldOff className="h-4 w-4" /><span className="ml-1 hidden sm:inline">Remover acesso</span>
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => startEdit(e)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) del.mutate(e.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{editing ? "Editar" : "Novo"} funcionário</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            <div><Label>Nome</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Cargo</Label>
              <Select value={form.job_role} onValueChange={applyRolePreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Ao salvar com e-mail, o acesso ao app é criado e o link de senha é enviado por e-mail.</p>
            <div><Label>Data de admissão</Label><Input type="date" value={form.hired_at ?? ""} onChange={(e) => setForm({ ...form, hired_at: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Permissões individuais (ajustes finos)</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {MODULES.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm capitalize">
                    <Checkbox
                      checked={!!form.permissions?.[m]}
                      onCheckedChange={(v) => setForm({ ...form, permissions: { ...form.permissions, [m]: !!v } })}
                    /> {m.replace("_", " & ")}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} />
              <Label>Ativo</Label>
            </div>
            <div><Label>Notas</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <SheetFooter className="mt-4"><Button onClick={() => save.mutate()} disabled={save.isPending || !form.full_name}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
