import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gatewayFetch, getPaddleClient, type PaddleEnv } from "@/lib/paddle.server";

const envSchema = z.enum(["sandbox", "live"]);

/**
 * Resolve human-readable price ID (external_id) → Paddle internal `pri_...`.
 * Público (não requer auth) — usado apenas para renderizar checkout.
 */
export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((i: { priceId: string; environment: PaddleEnv }) => ({
    priceId: z.string().min(1).parse(i.priceId),
    environment: envSchema.parse(i.environment),
  }))
  .handler(async ({ data }) => {
    const res = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    if (!json.data?.length) throw new Error(`Preço não encontrado: ${data.priceId}`);
    return json.data[0].id;
  });

/**
 * Retorna estado da assinatura da EMPRESA do usuário logado.
 */
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("company_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.company_id) return null;

    const { data: company } = await context.supabase
      .from("companies")
      .select(
        "id,name,subscription_status,trial_expires_at,plan,billing_provider,billing_price_id,billing_environment,current_period_end,cancel_at_period_end",
      )
      .eq("id", profile.company_id)
      .maybeSingle();
    if (!company) return null;

    const now = Date.now();
    const trialMs = company.trial_expires_at
      ? new Date(company.trial_expires_at).getTime() - now
      : null;
    const periodMs = company.current_period_end
      ? new Date(company.current_period_end).getTime() - now
      : null;

    const isTrialing =
      company.subscription_status === "trialing" && trialMs !== null && trialMs > 0;
    const hasActive =
      company.subscription_status === "active" ||
      company.subscription_status === "past_due";
    const canceledButActive =
      company.subscription_status === "canceled" && periodMs !== null && periodMs > 0;

    return {
      ...company,
      hasAccess: isTrialing || hasActive || canceledButActive,
      trialDaysLeft: trialMs !== null ? Math.max(0, Math.ceil(trialMs / 86_400_000)) : null,
    };
  });

/**
 * Abre o Customer Portal do Paddle para o admin gerenciar assinatura/pagamento.
 * Retorna URL.
 */
export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("company_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.company_id) throw new Error("Empresa não encontrada");

    // só admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas o admin pode gerenciar a assinatura");

    const { data: company } = await context.supabase
      .from("companies")
      .select("billing_provider,billing_customer_id,billing_subscription_id,billing_environment")
      .eq("id", profile.company_id)
      .maybeSingle();

    if (!company?.billing_customer_id || company.billing_provider !== "paddle") {
      throw new Error("Ainda não há assinatura ativa para gerenciar.");
    }

    const env = (company.billing_environment ?? "sandbox") as PaddleEnv;
    const paddle = getPaddleClient(env);
    const subs = company.billing_subscription_id ? [company.billing_subscription_id] : [];
    const portal = await paddle.customerPortalSessions.create(
      company.billing_customer_id,
      subs,
    );
    return { url: portal.urls.general.overview };
  });
