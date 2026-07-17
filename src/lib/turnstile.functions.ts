import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const verifySchema = z.object({ token: z.string().min(1).max(4096) });

/**
 * Verifica um token do Cloudflare Turnstile junto à API oficial (siteverify).
 * Roda no servidor — a chave secreta nunca é exposta ao navegador.
 */
export const verifyTurnstileToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      // Sem chave secreta configurada no servidor: não bloqueia o uso do
      // sistema (evita deixar todo mundo trancado fora por uma falta de
      // configuração), mas também não concede aprovação — é tratado como
      // "captcha desativado" pelo lado do cliente.
      return { success: false, configured: false as const };
    }

    try {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: data.token }),
      });
      const json = (await res.json()) as { success: boolean };
      return { success: Boolean(json.success), configured: true as const };
    } catch {
      return { success: false, configured: true as const };
    }
  });
