import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteSchema = z.object({
  tutorId: z.string().uuid(),
  email: z.string().trim().email().max(255),
});

/**
 * Convida um tutor: cria/garante o usuário no Auth com o e-mail dele,
 * vincula o user_id no registro do tutor e dispara o link de definir senha.
 * Só admin pode chamar.
 */
export const inviteTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a administradora pode enviar convites.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Tentar criar o usuário (email_confirm true para já permitir login)
    let authUserId: string | null = null;
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
    });

    if (created.error) {
      const msg = created.error.message?.toLowerCase() ?? "";
      const alreadyExists =
        created.error.status === 422 || msg.includes("already") || msg.includes("registered");
      if (!alreadyExists) throw new Error(created.error.message);

      // já existe → buscar
      let page = 1;
      while (!authUserId) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw new Error(error.message);
        const match = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
        if (match) {
          authUserId = match.id;
          break;
        }
        if (list.users.length < 200) break;
        page += 1;
      }
      if (!authUserId) throw new Error("Não consegui localizar o usuário existente.");
    } else {
      authUserId = created.data.user?.id ?? null;
    }
    if (!authUserId) throw new Error("Falha ao obter o id do usuário.");

    // 2) Garantir o papel "tutor"
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: authUserId, role: "tutor" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

    // 3) Vincular ao registro do tutor
    const { error: updErr } = await supabaseAdmin
      .from("tutors")
      .update({ user_id: authUserId, email: data.email })
      .eq("id", data.tutorId);
    if (updErr) throw new Error(updErr.message);

    // 4) Enviar link "definir senha" (usa reset password)
    const siteUrl = process.env.SUPABASE_URL ? undefined : undefined;
    const redirectTo = process.env.PUBLIC_SITE_URL
      ? `${process.env.PUBLIC_SITE_URL}/reset-password`
      : undefined;

    const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo,
    });
    if (linkErr) {
      // Não falhar duro — o tutor pode usar "esqueci a senha" depois
      return { ok: true, message: "Tutor vinculado, mas o e-mail não saiu. Peça para ele usar 'esqueci a senha'." };
    }

    return { ok: true, message: "Convite enviado! O tutor vai receber um e-mail para definir a senha." };
  });
