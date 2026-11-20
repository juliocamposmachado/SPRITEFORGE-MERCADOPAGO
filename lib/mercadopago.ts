const MP_API = "https://api.mercadopago.com";

export type MercadoPagoSubscription = {
  id: string;
  payer_email?: string;
  status?: string;
  preapproval_plan_id?: string | null;
  reason?: string;
  next_payment_date?: string | null;
  date_created?: string;
  last_modified?: string;
  init_point?: string;
};

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado no servidor.");
  return token;
}

export async function searchSubscriptionsByEmail(email: string) {
  const url = new URL(`${MP_API}/preapproval/search`);
  url.searchParams.set("payer_email", email);
  url.searchParams.set("limit", "100");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Mercado Pago retornou HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json() as {
    results?: MercadoPagoSubscription[];
  };

  return Array.isArray(payload.results) ? payload.results : [];
}

export async function checkSubscription(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const results = await searchSubscriptionsByEmail(email);

  const configuredPlanId = process.env.MP_PREAPPROVAL_PLAN_ID?.trim();
  const matching = results.filter((item) => {
    const sameEmail = item.payer_email?.trim().toLowerCase() === email;
    const samePlan = !configuredPlanId || item.preapproval_plan_id === configuredPlanId;
    return sameEmail && samePlan;
  });

  // Para assinatura recorrente, "authorized" indica contrato autorizado.
  // Estados pending, paused, cancelled e outros não liberam Premium.
  const active = matching
    .filter((item) => item.status === "authorized")
    .sort((a, b) => {
      const ta = Date.parse(a.last_modified || a.date_created || "") || 0;
      const tb = Date.parse(b.last_modified || b.date_created || "") || 0;
      return tb - ta;
    });

  const subscription = active[0];

  return {
    found: matching.length > 0,
    subscription_active: Boolean(subscription),
    premium_eligible: Boolean(subscription),
    status: subscription?.status ?? matching[0]?.status ?? "not_found",
    subscription_id: subscription?.id ?? null,
    next_payment_date: subscription?.next_payment_date ?? null,
    plan_id: subscription?.preapproval_plan_id ?? null,
    // O retorno do MP não comprova que a pessoa no ChatGPT controla o e-mail.
    identity_verified: false,
    access_granted: false,
    message: subscription
      ? "Assinatura autorizada localizada. É necessário concluir a verificação de identidade antes de liberar recursos Premium."
      : "Nenhuma assinatura autorizada correspondente foi localizada."
  };
}
