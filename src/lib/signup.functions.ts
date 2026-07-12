import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  companyName: z.string().trim().min(2, "Nome da empresa muito curto").max(120),
  fullName: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

/**
 * Cria uma nova empresa (tenant) + usuário admin dessa empresa.
 * Público (sem auth) — a segurança fica no rate limit natural do Supabase
 * e na validação de entrada. Usa service role para operações administrativas.
 */
export const signupCompany = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => schema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Cria empresa com trial de 14 dias
    const trialExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: company, error: cErr } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.companyName,
        email: data.email,
        phone: data.phone || null,
        subscription_status: "trialing",
        trial_expires_at: trialExpires,
      })
      .select("id")
      .single();
    if (cErr || !company) throw new Error(cErr?.message ?? "Não foi possível criar a empresa.");

    // 2) Cria o usuário Auth já vinculado à empresa via metadata
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        company_id: company.id,
      },
    });
    if (created.error || !created.data.user) {
      // rollback empresa
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      const msg = created.error?.message ?? "Falha ao criar usuário.";
      throw new Error(
        msg.toLowerCase().includes("already")
          ? "Este e-mail já está cadastrado. Faça login."
          : msg,
      );
    }
    const userId = created.data.user.id;

    // 3) Garante profile ligado à empresa (o trigger já tenta; aqui garantimos)
    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: data.fullName,
          phone: data.phone || null,
          company_id: company.id,
          must_set_password: false,
        },
        { onConflict: "id" },
      );

    // 4) Concede papel admin para essa empresa
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "admin", company_id: company.id },
        { onConflict: "user_id,role,unit_id", ignoreDuplicates: true },
      );

    return { ok: true, companyId: company.id };
  });
