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
    // Não propaga o corpo bruto da API para a resposta MCP.
    throw new Error(`Mercado Pago retornou HTTP ${response.status} durante a busca de assinaturas.`);
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

  // "authorized" indica contrato de assinatura autorizado, não comprova
  // que a cobrança mais recente foi liquidada ou que a identidade foi verificada.
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
    subscription_contract_authorized: Boolean(subscription),
    // Mantido false até existir validação de pagamento + OTP + licença persistida.
    premium_eligible: false,
    status: subscription?.status ?? matching[0]?.status ?? "not_found",
    subscription_id: subscription?.id ?? null,
    next_payment_date: subscription?.next_payment_date ?? null,
    plan_id: subscription?.preapproval_plan_id ?? null,
    search_results_count: results.length,
    matching_subscriptions_count: matching.length,
    authorized_subscriptions_count: active.length,
    plan_filter_enabled: Boolean(configuredPlanId),
    identity_verified: false,
    access_granted: false,
    message: subscription
      ? "Contrato de assinatura autorizado localizado. A cobrança vigente e a identidade ainda precisam ser verificadas; nenhum acesso Premium foi concedido."
      : "Nenhuma assinatura correspondente ao e-mail e ao filtro de plano foi localizada. Confira o e-mail do pagador, o tipo de pagamento e o ID do plano."
  };
}
