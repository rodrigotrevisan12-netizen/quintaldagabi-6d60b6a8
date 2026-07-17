import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({ userId: z.string().uuid(), email: z.string().email().optional() });

async function writeAuditEvent(action: "login" | "logout" | "password_change", userId: string, email?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await (supabaseAdmin as any)
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();

  await (supabaseAdmin as any).from("audit_log").insert({
    actor_user_id: userId,
    actor_email: email ?? null,
    action,
    table_name: null,
    company_id: profile?.company_id ?? null,
  });
}

export const recordLoginEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    await writeAuditEvent("login", data.userId, data.email).catch(() => {});
    return { ok: true };
  });

export const recordLogoutEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    await writeAuditEvent("logout", data.userId, data.email).catch(() => {});
    return { ok: true };
  });

export const recordPasswordChangeEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    await writeAuditEvent("password_change", data.userId, data.email).catch(() => {});
    return { ok: true };
  });
