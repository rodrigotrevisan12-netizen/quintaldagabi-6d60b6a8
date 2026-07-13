import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

// Defer supabase client construction until first use.
let _sb: SupabaseClient<Database> | null = null;
function sb(): SupabaseClient<Database> {
  if (!_sb) {
    _sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _sb;
}

type AnyRec = Record<string, unknown>;

function getCompanyIdFromCustomData(customData: unknown): string | null {
  if (!customData || typeof customData !== "object") return null;
  const cd = customData as AnyRec;
  return typeof cd.companyId === "string" ? cd.companyId : null;
}

async function handleSubscriptionCreated(data: AnyRec, env: PaddleEnv) {
  const companyId = getCompanyIdFromCustomData(data.customData);
  if (!companyId) {
    console.error("[webhook] subscription.created sem companyId em customData");
    return;
  }
  const items = (data.items as Array<AnyRec> | undefined) ?? [];
  const first = items[0] ?? {};
  const price = (first.price as AnyRec | undefined) ?? {};
  const importMeta = (price.importMeta as AnyRec | undefined) ?? {};
  const priceExternalId = typeof importMeta.externalId === "string" ? importMeta.externalId : null;
  if (!priceExternalId) {
    console.warn("[webhook] price.importMeta.externalId ausente — pulando");
    return;
  }
  const billing = (data.currentBillingPeriod as AnyRec | undefined) ?? {};

  await sb()
    .from("companies")
    .update({
      billing_provider: "paddle",
      billing_customer_id: data.customerId as string,
      billing_subscription_id: data.id as string,
      billing_price_id: priceExternalId,
      billing_environment: env,
      subscription_status: data.status as string,
      plan: priceExternalId,
      current_period_end: (billing.endsAt as string | undefined) ?? null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
}

async function handleSubscriptionUpdated(data: AnyRec, env: PaddleEnv) {
  const billing = (data.currentBillingPeriod as AnyRec | undefined) ?? {};
  const scheduled = (data.scheduledChange as AnyRec | undefined) ?? {};
  const items = (data.items as Array<AnyRec> | undefined) ?? [];
  const first = items[0] ?? {};
  const price = (first.price as AnyRec | undefined) ?? {};
  const importMeta = (price.importMeta as AnyRec | undefined) ?? {};
  const priceExternalId =
    typeof importMeta.externalId === "string" ? importMeta.externalId : null;

  const patch: Database["public"]["Tables"]["companies"]["Update"] = {
    subscription_status: data.status as string,
    current_period_end: (billing.endsAt as string | undefined) ?? null,
    cancel_at_period_end: scheduled?.action === "cancel",
    billing_environment: env,
    updated_at: new Date().toISOString(),
  };
  if (priceExternalId) {
    patch.billing_price_id = priceExternalId;
    patch.plan = priceExternalId;
  }

  await sb()
    .from("companies")
    .update(patch)
    .eq("billing_subscription_id", data.id as string);
}

async function handleSubscriptionCanceled(data: AnyRec) {
  await sb()
    .from("companies")
    .update({
      subscription_status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("billing_subscription_id", data.id as string);
}

async function processEvent(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data as unknown as AnyRec, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data as unknown as AnyRec, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data as unknown as AnyRec);
      break;
    default:
      console.log("[webhook] evento não tratado:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await processEvent(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] erro:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
