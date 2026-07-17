import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { checkLoginLock, recordFailedLogin, recordSuccessfulLogin } from "@/lib/login-security.functions";
import { recordLoginEvent } from "@/lib/audit-events.functions";
import { needsMfaStepUp, listTotpFactors, verifyLoginMfaCode } from "@/lib/mfa";
import { verifyTurnstileToken } from "@/lib/turnstile.functions";
import { isTurnstileConfigured, renderTurnstile, resetTurnstile } from "@/lib/turnstile";

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
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HTMLDivElement>(null);
  const captchaWidgetId = useRef<string | undefined>(undefined);

  const checkLock = useServerFn(checkLoginLock);
  const recordFailed = useServerFn(recordFailedLogin);
  const recordSuccess = useServerFn(recordSuccessfulLogin);
  const recordLogin = useServerFn(recordLoginEvent);
  const verifyCaptcha = useServerFn(verifyTurnstileToken);

  useEffect(() => {
    if (mode !== "login" || !captchaRef.current || !isTurnstileConfigured()) return;
    let cancelled = false;
    renderTurnstile(
      captchaRef.current,
      (token) => !cancelled && setCaptchaToken(token),
      () => !cancelled && setCaptchaToken(null),
    ).then((id) => {
      if (!cancelled) captchaWidgetId.current = id;
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

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
    setLockMessage(null);

    // CAPTCHA: só bloqueia o login se estiver configurado (chave presente)
    // — assim, enquanto o Cloudflare não estiver com a chave secreta
    // configurada no servidor, o login continua funcionando normalmente.
    if (isTurnstileConfigured()) {
      if (!captchaToken) {
        setLoading(false);
        toast.error("Confirme que você não é um robô antes de entrar.");
        return;
      }
      try {
        const captchaResult = await verifyCaptcha({ data: { token: captchaToken } });
        if (captchaResult.configured && !captchaResult.success) {
          setLoading(false);
          toast.error("Não conseguimos confirmar o CAPTCHA. Tente novamente.");
          resetTurnstile(captchaWidgetId.current);
          setCaptchaToken(null);
          return;
        }
      } catch {
        // Falha ao verificar não trava o login — só significa que essa
        // camada específica de proteção não pôde ser confirmada agora.
      }
    }

    // Verifica se esse e-mail está temporariamente bloqueado antes de
    // sequer tentar autenticar — protege contra tentativa de força bruta.
    try {
      const lockStatus = await checkLock({ data: { email: emailParsed.data } });
      if (lockStatus.locked) {
        const minutes = Math.ceil(lockStatus.retryAfterSeconds / 60);
        setLoading(false);
        setLockMessage(
          `Muitas tentativas erradas. Tente novamente em ${minutes} minuto${minutes > 1 ? "s" : ""}, ou use "Esqueci minha senha".`,
        );
        return;
      }
    } catch {
      // Se a checagem de bloqueio falhar por algum motivo, não impede o
      // login — só significa que essa proteção específica não rodou agora.
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailParsed.data,
      password: pwParsed.data,
    });
    setLoading(false);
    resetTurnstile(captchaWidgetId.current);
    setCaptchaToken(null);
    if (error || !data.user) {
      try {
        const result = await recordFailed({ data: { email: emailParsed.data } });
        if (result.locked) {
          setLockMessage(`Muitas tentativas erradas. Sua conta ficou temporariamente bloqueada por 15 minutos.`);
        } else if (result.remainingAttempts <= 2) {
          toast.error(`E-mail ou senha incorretos. Restam ${result.remainingAttempts} tentativas antes do bloqueio temporário.`);
        } else {
          toast.error("Não conseguimos entrar. Verifique e-mail e senha.");
        }
      } catch {
        toast.error("Não conseguimos entrar. Verifique e-mail e senha.");
      }
      return;
    }

    // Senha correta — mas se a conta tiver verificação em duas etapas
    // ativada, ainda falta confirmar o código antes de liberar o acesso.
    const needsMfa = await needsMfaStepUp();
    if (needsMfa) {
      const factors = await listTotpFactors();
      if (factors[0]) {
        setMfaFactorId(factors[0].id);
        setPendingUserId(data.user.id);
        return;
      }
    }

    recordSuccess({ data: { email: emailParsed.data } }).catch(() => {});
    recordLogin({ data: { userId: data.user.id, email: data.user.email } }).catch(() => {});
    toast.success("Bem-vinda!");
    await redirectByRole(data.user.id);
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId || !pendingUserId) return;
    if (mfaCode.trim().length !== 6) {
      toast.error("Digite o código de 6 dígitos do seu app autenticador.");
      return;
    }
    setMfaLoading(true);
    try {
      await verifyLoginMfaCode(mfaFactorId, mfaCode.trim());
      recordLogin({ data: { userId: pendingUserId, email } }).catch(() => {});
      toast.success("Bem-vinda!");
      await redirectByRole(pendingUserId);
    } catch (err: any) {
      toast.error(err.message ?? "Código inválido.");
    } finally {
      setMfaLoading(false);
    }
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

          {mfaFactorId ? (
            <>
              <h1 className="font-display text-3xl font-semibold">Verificação em duas etapas</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Digite o código de 6 dígitos do seu app autenticador.
              </p>
              <form onSubmit={handleMfaSubmit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfa-login-code">Código</Label>
                  <Input
                    id="mfa-login-code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={mfaLoading}>
                  {mfaLoading ? "Verificando…" : "Confirmar"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMfaFactorId(null); setPendingUserId(null); setMfaCode(""); }}
                  className="w-full text-center text-xs text-muted-foreground hover:underline"
                >
                  Voltar
                </button>
              </form>
            </>
          ) : mode === "login" ? (
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLockMessage(null);
                    }}
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
                  <PasswordInput
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div ref={captchaRef} className="flex justify-center" />
                <Button type="submit" className="w-full" disabled={loading || Boolean(lockMessage)}>
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
                {lockMessage && (
                  <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{lockMessage}</p>
                )}
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
