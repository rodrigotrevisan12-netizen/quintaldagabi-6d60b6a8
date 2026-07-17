import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Sempre que o texto de Termos/Privacidade mudar de forma relevante, troque
// esta data — assim fica registrado exatamente a QUAL versão cada pessoa
// deu consentimento.
export const TERMS_VERSION = "2026-07-17";

const schema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  userAgent: z.string().max(500).optional(),
});

export const recordConsent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("company_id")
      .eq("id", data.userId)
      .maybeSingle();

    const { error } = await (supabaseAdmin as any).from("consent_records").insert({
      user_id: data.userId,
      email: data.email ?? null,
      consent_type: "termos_privacidade",
      terms_version: TERMS_VERSION,
      user_agent: data.userAgent ?? null,
      company_id: profile?.company_id ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });
