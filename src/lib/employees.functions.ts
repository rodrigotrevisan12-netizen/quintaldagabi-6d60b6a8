import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteSchema = z.object({
  employeeId: z.string().uuid(),
  email: z.string().trim().email().max(255),
});

/**
 * Cria/garante o usuário Auth para um funcionário, vincula no registro,
 * concede papel "funcionario", marca que precisa definir senha e dispara link de senha.
 */
export const inviteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a administradora pode criar acesso.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let authUserId: string | null = null;
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
    });

    if (created.error) {
      const msg = created.error.message?.toLowerCase() ?? "";
      const exists = created.error.status === 422 || msg.includes("already") || msg.includes("registered");
      if (!exists) throw new Error(created.error.message);
      let page = 1;
      while (!authUserId) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw new Error(error.message);
        const match = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
        if (match) { authUserId = match.id; break; }
        if (list.users.length < 200) break;
        page += 1;
      }
      if (!authUserId) throw new Error("Não consegui localizar o usuário existente.");
    } else {
      authUserId = created.data.user?.id ?? null;
    }
    if (!authUserId) throw new Error("Falha ao obter id do usuário.");

    // Empresa do admin que está criando o funcionário
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();
    const companyId = adminProfile?.company_id;
    if (!companyId) throw new Error("Empresa do administrador não encontrada.");

    // Remove papel "tutor" se houver — esse usuário agora é funcionário
    await supabaseAdmin.from("user_roles").delete().eq("user_id", authUserId).eq("role", "tutor");

    // Garante papel "funcionario"
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: authUserId, role: "funcionario", company_id: companyId }, { onConflict: "user_id,role,unit_id", ignoreDuplicates: true });

    // Marca obrigação de definir senha no 1º acesso
    await supabaseAdmin.from("profiles").upsert(
      { id: authUserId, must_set_password: true, company_id: companyId },
      { onConflict: "id" },
    );

    const { error: updErr } = await supabaseAdmin
      .from("employees")
      .update({ user_id: authUserId, email: data.email })
      .eq("id", data.employeeId);
    if (updErr) throw new Error(updErr.message);

    const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://quintaldagabi.lovable.app";
    const redirectTo = `${siteUrl}/reset-password`;

    const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo });
    if (linkErr) {
      return { ok: true, message: "Acesso criado. O e-mail não saiu agora — use 'Copiar link de senha' para enviar manualmente." };
    }
    return { ok: true, message: "Acesso criado! O funcionário receberá e-mail para definir a senha." };
  });
