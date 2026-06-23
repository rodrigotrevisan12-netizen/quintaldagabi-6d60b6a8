import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteSchema = z.object({
  employeeId: z.string().uuid(),
  email: z.string().trim().email().max(255),
});

/**
 * Cria/garante o usuário Auth para um funcionário, vincula no registro,
 * concede papel "funcionario" e envia link de definição de senha.
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

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: authUserId, role: "funcionario" }, { onConflict: "user_id,role", ignoreDuplicates: true });

    const { error: updErr } = await supabaseAdmin
      .from("employees")
      .update({ user_id: authUserId, email: data.email })
      .eq("id", data.employeeId);
    if (updErr) throw new Error(updErr.message);

    const redirectTo = process.env.PUBLIC_SITE_URL
      ? `${process.env.PUBLIC_SITE_URL}/reset-password`
      : undefined;

    const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo });
    if (linkErr) {
      return { ok: true, message: "Funcionário vinculado, mas o e-mail não saiu. Peça para usar 'esqueci a senha' no login." };
    }
    return { ok: true, message: "Acesso criado! O funcionário vai receber e-mail para definir a senha." };
  });
