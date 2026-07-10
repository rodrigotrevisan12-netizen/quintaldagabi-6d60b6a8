import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteSchema = z.object({
  tutorId: z.string().uuid(),
  email: z.string().trim().email().max(255),
});

/**
 * Convida um tutor: cria/garante o usuário no Auth com o e-mail dele,
 * vincula o user_id no registro do tutor, marca "precisa definir senha"
 * e dispara o link de definir senha. Só admin pode chamar.
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

    // Empresa do admin que está convidando o tutor
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();
    const companyId = adminProfile?.company_id;
    if (!companyId) throw new Error("Empresa do administrador não encontrada.");

    // Garante papel "tutor" (não remove outros — admin/funcionario podem ser também tutor da própria casa)
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: authUserId, role: "tutor", company_id: companyId },
        { onConflict: "user_id,role,unit_id", ignoreDuplicates: true },
      );

    // Marca obrigação de definir senha no 1º acesso
    await supabaseAdmin.from("profiles").upsert(
      { id: authUserId, must_set_password: true, company_id: companyId },
      { onConflict: "id" },
    );

    const { error: updErr } = await supabaseAdmin
      .from("tutors")
      .update({ user_id: authUserId, email: data.email })
      .eq("id", data.tutorId);
    if (updErr) throw new Error(updErr.message);

    const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://quintaldagabi.lovable.app";
    const redirectTo = `${siteUrl}/reset-password`;

    const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo,
    });
    if (linkErr) {
      return { ok: true, message: "Tutor vinculado. O e-mail não saiu — use 'Copiar link de senha' para enviar manualmente." };
    }

    return { ok: true, message: "Convite enviado! O tutor receberá e-mail para definir a senha." };
  });
