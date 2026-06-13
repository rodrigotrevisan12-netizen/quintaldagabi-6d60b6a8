import { createServerFn } from "@tanstack/react-start";

export const seedAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: "gabrielamarquezinpirana@gmail.com",
      email_confirm: true,
    });

    if (error) {
      // Código 422 geralmente significa "user already exists"
      if (error.status === 422 || error.message?.toLowerCase().includes("already")) {
        return { ok: true, message: "Conta de administradora já existe. Use 'Esqueci a senha' para entrar." };
      }
      throw new Error(error.message);
    }

    return { ok: true, message: "Conta criada! Agora clique em 'Esqueci a senha' para definir sua senha." };
  });
