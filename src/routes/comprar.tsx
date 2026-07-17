import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { strongPasswordSchema, PASSWORD_REQUIREMENTS_TEXT } from "@/lib/password-schema";
import { Label } from "@/components/ui/label";
import { signupCompany } from "@/lib/signup.functions";

export const Route = createFileRoute("/comprar")({
  head: () => ({
    meta: [
      { title: "Criar conta — Central Pet" },
      {
        name: "description",
        content:
          "Comece grátis por 14 dias. Crie a conta da sua creche, hotel ou day care canino em menos de 1 minuto.",
      },
      { property: "og:title", content: "Comece grátis por 14 dias — Central Pet" },
      {
        property: "og:description",
        content: "Sem cartão. Cadastre sua empresa e libere o sistema completo agora.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const signup = useServerFn(signupCompany);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  function upd<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error("Você precisa aceitar os Termos de Serviço e a Política de Privacidade.");
      return;
    }
    const pwParsed = strongPasswordSchema.safeParse(form.password);
    if (!pwParsed.success) {
      toast.error(pwParsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      await signup({ data: form });
      // login automático
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signErr) {
        toast.success("Conta criada! Faça login para começar.");
        navigate({ to: "/auth" });
        return;
      }
      toast.success("Bem-vindo(a) à Central Pet! Você tem 14 dias grátis.");
      navigate({ to: "/app" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Lado decorativo */}
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
            <h2 className="text-4xl font-extrabold leading-tight">
              14 dias grátis. Sem cartão.
            </h2>
            <p className="mt-3 text-white/90">
              Crie a conta da sua empresa e comece a usar o sistema completo agora.
            </p>
            <ul className="mt-6 space-y-2 text-white/90">
              <li>✓ Agenda, cães, tutores e financeiro</li>
              <li>✓ Contratos digitais e boletins</li>
              <li>✓ Portal para o tutor</li>
              <li>✓ Cancele quando quiser</li>
            </ul>
          </div>
          <div className="text-sm text-white/80">100% multiempresa · seus dados são só seus</div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-orange-50/40 px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span
              className="grid h-9 w-9 place-items-center rounded-full text-lg text-white"
              style={{ background: "linear-gradient(135deg,#FF7F50,#FFCA3A)" }}
            >
              🐾
            </span>
            <span className="text-lg font-extrabold text-[#E86A3C]">Central Pet</span>
          </Link>

          <h1 className="font-display text-3xl font-semibold">Criar minha conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Preencha para começar seus 14 dias grátis.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da empresa</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => upd("companyName", e.target.value)}
                placeholder="Ex.: Quintal do Rex"
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Seu nome</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => upd("fullName", e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => upd("email", e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp (opcional)</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => upd("phone", e.target.value)}
                placeholder="(11) 99999-9999"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => upd("password", e.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
              <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_TEXT}</p>
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
              />
              <span>
                Li e concordo com os{" "}
                <Link to="/termos" target="_blank" className="text-primary hover:underline">
                  Termos de Serviço
                </Link>{" "}
                e a{" "}
                <Link to="/privacidade" target="_blank" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>
              {loading ? "Criando conta…" : "Começar grátis"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/auth" className="font-semibold text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
