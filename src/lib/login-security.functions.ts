import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Regras do bloqueio — ajuste aqui se quiser mudar o comportamento.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(255) });

/**
 * Verifica se um e-mail está temporariamente bloqueado por excesso de
 * tentativas de login erradas. Chamada ANTES de tentar autenticar —
 * pública de propósito (login em si é uma ação pré-autenticação).
 */
export const checkLoginLock = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await (supabaseAdmin as any)
      .from("login_attempts")
      .select("locked_until, failed_count")
      .eq("email", data.email)
      .maybeSingle();

    if (row?.locked_until && new Date(row.locked_until) > new Date()) {
      const retryAfterSeconds = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 1000);
      return { locked: true, retryAfterSeconds };
    }

    return { locked: false, retryAfterSeconds: 0 };
  });

/**
 * Registra uma tentativa de login que falhou. Se ultrapassar o limite,
 * bloqueia o e-mail por LOCKOUT_MINUTES.
 */
export const recordFailedLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await (supabaseAdmin as any)
      .from("login_attempts")
      .select("failed_count")
      .eq("email", data.email)
      .maybeSingle();

    const nextCount = (row?.failed_count ?? 0) + 1;
    const lockedUntil =
      nextCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : null;

    await (supabaseAdmin as any).from("login_attempts").upsert({
      email: data.email,
      failed_count: lockedUntil ? 0 : nextCount, // zera o contador ao travar, começa do zero na próxima janela
      locked_until: lockedUntil,
      last_attempt_at: new Date().toISOString(),
    });

    // Limpeza leve e barata de registros antigos — não precisa de cron.
    await (supabaseAdmin as any).rpc("cleanup_old_login_attempts");

    return {
      locked: Boolean(lockedUntil),
      remainingAttempts: lockedUntil ? 0 : Math.max(0, MAX_FAILED_ATTEMPTS - nextCount),
    };
  });

/**
 * Login bem-sucedido — zera o contador de tentativas desse e-mail.
 */
export const recordSuccessfulLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("login_attempts").delete().eq("email", data.email);
    return { ok: true };
  });
