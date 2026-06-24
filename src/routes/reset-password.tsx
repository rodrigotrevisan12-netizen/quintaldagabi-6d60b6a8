import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Definir senha — Quintal da Gabi" }],
  }),
  component: ResetPassword,
});

const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter ao menos 8 caracteres")
  .max(72);

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        toast.error("Link inválido ou expirado. Solicite um novo.");
        navigate({ to: "/auth" });
      }
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (password !== confirm) return toast.error("As senhas não conferem.");

    setLoading(true);
    const { data: userData, error } = await supabase.auth.updateUser({ password: parsed.data });
    if (error) {
      setLoading(false);
      toast.error("Não foi possível salvar a nova senha.");
      return;
    }
    // O trigger no banco já desmarca must_set_password; encaminhamos por papel.
    const uid = userData.user?.id;
    let to: "/app" | "/tutor" = "/tutor";
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const list = (roles ?? []).map((r) => r.role);
      if (list.includes("admin") || list.includes("funcionario")) to = "/app";
    }
    setLoading(false);
    toast.success("Senha definida! Você já está dentro.");
    navigate({ to });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Validando link…
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold">Defina sua senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha uma senha com no mínimo 8 caracteres para liberar seu acesso.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">Nova senha</Label>
            <Input id="pw" type="password" autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Confirmar senha</Label>
            <Input id="pw2" type="password" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando…" : "Salvar senha"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={handleSignOut}>
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}
