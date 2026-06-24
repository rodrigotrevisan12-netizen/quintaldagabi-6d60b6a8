import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Apenas a administradora pode executar essa ação.");
}

/**
 * Gera um link de definição de senha (recovery) para a admin copiar e
 * enviar manualmente por WhatsApp enquanto o domínio de e-mail não está pronto.
 */
export const getPasswordSetupLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://quintaldagabi.lovable.app";
    const redirectTo = `${siteUrl}/reset-password`;

    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo },
    });
    if (error) throw new Error(error.message);
    const url = linkData?.properties?.action_link;
    if (!url) throw new Error("Não consegui gerar o link.");
    return { url };
  });

/** Revoga acesso de um funcionário: tira a role, desvincula o user_id e deleta o usuário Auth. */
export const revokeEmployeeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ employeeId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: emp, error: e1 } = await supabaseAdmin
      .from("employees").select("user_id").eq("id", data.employeeId).maybeSingle();
    if (e1) throw new Error(e1.message);
    const uid = emp?.user_id;
    await supabaseAdmin.from("employees").update({ user_id: null }).eq("id", data.employeeId);
    if (uid) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
      await supabaseAdmin.auth.admin.deleteUser(uid);
    }
    return { ok: true };
  });

/** Revoga acesso de um tutor (mesmo padrão). */
export const revokeTutorAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ tutorId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tut, error: e1 } = await supabaseAdmin
      .from("tutors").select("user_id").eq("id", data.tutorId).maybeSingle();
    if (e1) throw new Error(e1.message);
    const uid = tut?.user_id;
    await supabaseAdmin.from("tutors").update({ user_id: null }).eq("id", data.tutorId);
    if (uid) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
      await supabaseAdmin.auth.admin.deleteUser(uid);
    }
    return { ok: true };
  });
