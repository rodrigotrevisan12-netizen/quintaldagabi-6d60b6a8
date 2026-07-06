import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Central Pet" },
      { name: "description", content: "Acesse o sistema Central Pet." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const passwordSchema = z.string().min(8, "Mínimo de 8 caracteres").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function redirectByRole(userId: string) {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const list = (roles ?? []).map((r) => r.role);
    const isStaff = list.includes("admin") || list.includes("funcionario");
    navigate({ to: isStaff ? "/app" : "/tutor" });
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) redirectByRole(data.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const emailParsed = emailSchema.safeParse(email);
    const pwParsed = passwordSchema.safeParse(password);
    if (!emailParsed.success) return toast.error(emailParsed.error.issues[0].message);
    if (!pwParsed.success) return toast.error(pwParsed.error.issues[0].message);

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailParsed.data,
      password: pwParsed.data,
    });
    setLoading(false);
    if (error || !data.user) {
      toast.error("Não conseguimos entrar. Verifique e-mail e senha.");
      return;
    }
    toast.success("Bem-vinda!");
    await redirectByRole(data.user.id);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    const emailParsed = emailSchema.safeParse(email);
    if (!emailParsed.success) return toast.error(emailParsed.error.issues[0].message);

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailParsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail.");
      return;
    }
    toast.success("Enviamos um e-mail com o link para você criar a senha.");
    setMode("login");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Lado decorativo — identidade Central Pet */}
      <div
        className="relative hidden lg:block"
        style={{ background: "linear-gradient(135deg,#FF7F50,#FFCA3A)" }}
      >
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-xl">
              🐾
            </span>
            <span className="text-2xl font-extrabold">Central Pet</span>
          </Link>
          <div>
            <h2 className="text-4xl font-extrabold leading-tight">Bem-vindo de volta!</h2>
            <p className="mt-3 text-white/90">
              Acesse sua empresa ou fale com a gente para criar uma nova.
            </p>
          </div>
          <div className="text-sm text-white/80">100% multiempresa · White label · Sem cartão</div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-orange-50/40 px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span
              className="grid h-9 w-9 place-items-center rounded-full text-lg text-white"
              style={{ background: "linear-gradient(135deg,#FF7F50,#FFCA3A)" }}
            >
              🐾
            </span>
            <span className="text-lg font-extrabold text-[#E86A3C]">Central Pet</span>
          </Link>

          {mode === "login" ? (
            <>
              <h1 className="font-display text-3xl font-semibold">Bem-vinda de volta</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Entre com seu e-mail e senha.
              </p>
              <form onSubmit={handleLogin} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci a senha
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  Primeiro acesso? Clique em "Esqueci a senha" e use o e-mail que
                  a administradora cadastrou para você.
                </p>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-semibold">Criar / redefinir senha</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Digite seu e-mail. Vamos te mandar um link para definir uma nova senha.
              </p>
              <form onSubmit={handleForgot} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-forgot">E-mail</Label>
                  <Input
                    id="email-forgot"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando…" : "Enviar link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode("login")}
                >
                  Voltar para login
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
