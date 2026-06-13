import { createServerFn } from "@tanstack/react-start";

export const seedAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica se já existe
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      filter: "email:gabrielamarquezinpirana@gmail.com",
    });
    if (list.users.length > 0) {
      return { ok: true, message: "Conta de administradora já existe. Use 'Esqueci a senha' para entrar." };
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: "gabrielamarquezinpirana@gmail.com",
      email_confirm: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true, message: "Conta criada! Agora clique em 'Esqueci a senha' para definir sua senha." };
  });
