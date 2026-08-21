/**
 * Abstraction des paiements Mobile Money (MTN MoMo Collection + Orange Money WebPay).
 *
 * - initiate() : déclenche une demande de paiement côté opérateur.
 * - getProviderConfig() : indique quels providers sont configurés (clés présentes).
 *
 * Si les identifiants d'un provider ne sont pas configurés, on bascule en
 * "mode démo" : la demande est simulée (statut pending) afin que l'UX complète
 * reste testable de bout en bout sans identifiants opérateur.
 */

export type MobileProvider = "mtn" | "orange";

export interface ProviderStatus {
  mtn: boolean;
  orange: boolean;
}

export interface InitiateParams {
  provider: MobileProvider;
  amount: number;
  /** Code devise ISO 4217 (MTN: XOF, UGX, RWF... ; Orange: XOF, XAF...). */
  currency: string;
  externalId: string;
  customerPhone: string;
  /** URL de notification serveur (webhook opérateur). */
  notifyUrl: string;
  /** URL de retour navigateur du client après paiement. */
  returnUrl: string;
  payerMessage?: string;
  payeeNote?: string;
}

export interface InitiateResult {
  ok: boolean;
  mode: "live" | "demo";
  providerReference: string | null;
  paymentUrl?: string | null;
  status: "pending" | "success" | "failed";
  message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RC = Record<string, any>;

function getProviderStatus(config: RC): ProviderStatus {
  return {
    mtn: Boolean(
      config.mtnMomoSubscriptionKey && config.mtnMomoApiUser && config.mtnMomoApiKey,
    ),
    orange: Boolean(
      config.orangeMoneyClientId && config.orangeMoneyClientSecret && config.orangeMoneyMerchantKey,
    ),
  };
}

/** MTN MoMo : récupère un access token (Collection). */
async function getMtnToken(config: RC): Promise<string | null> {
  const baseUrl = config.mtnMomoBaseUrl;
  const auth = Buffer.from(`${config.mtnMomoApiUser}:${config.mtnMomoApiKey}`).toString("base64");
  const env = config.mtnMomoEnvironment || "sandbox";
  const url =
    env === "production"
      ? `${baseUrl}/collection/token/`
      : `${baseUrl}/collection/token/`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Ocp-Apim-Subscription-Key": config.mtnMomoSubscriptionKey,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function initiateMtn(config: RC, params: InitiateParams): Promise<InitiateResult> {
  const baseUrl = config.mtnMomoBaseUrl;
  const env = config.mtnMomoEnvironment || "sandbox";
  const token = await getMtnToken(config);
  if (!token) {
    return {
      ok: false,
      mode: "live",
      providerReference: null,
      status: "failed",
      message: "Authentification MTN MoMo échouée (token).",
    };
  }
  const referenceId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": env === "production" ? "production" : "sandbox",
      "Ocp-Apim-Subscription-Key": config.mtnMomoSubscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(params.amount),
      currency: params.currency,
      externalId: params.externalId,
      payer: { partyIdType: "MSISDN", partyId: params.customerPhone },
      payerMessage: params.payerMessage || "Paiement",
      payeeNote: params.payeeNote || params.externalId,
    }),
  });

  if (res.status === 202) {
    return {
      ok: true,
      mode: "live",
      providerReference: referenceId,
      status: "pending",
    };
  }
  const detail = await res.text().catch(() => "");
  return {
    ok: false,
    mode: "live",
    providerReference: null,
    status: "failed",
    message: `MTN requesttopay ${res.status}: ${detail.slice(0, 200)}`,
  };
}

/** Orange Money : récupère un token OAuth (client_credentials). */
async function getOrangeToken(config: RC): Promise<string | null> {
  const auth = Buffer.from(
    `${config.orangeMoneyClientId}:${config.orangeMoneyClientSecret}`,
  ).toString("base64");
  const res = await fetch(`${config.orangeMoneyBaseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function initiateOrange(config: RC, params: InitiateParams): Promise<InitiateResult> {
  const token = await getOrangeToken(config);
  if (!token) {
    return {
      ok: false,
      mode: "live",
      providerReference: null,
      status: "failed",
      message: "Authentification Orange Money échouée (token).",
    };
  }
  const orderId = params.externalId;
  const res = await fetch(`${config.orangeMoneyBaseUrl}/webpayment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      merchant_key: config.orangeMoneyMerchantKey,
      currency: params.currency === "XOF" ? "XOF" : params.currency,
      order_id: orderId,
      amount: Math.round(params.amount),
      return_url: params.returnUrl,
      cancel_url: params.returnUrl,
      notif_url: params.notifyUrl,
      lang: "fr",
      reference: orderId,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      mode: "live",
      providerReference: null,
      status: "failed",
      message: `Orange webpayment ${res.status}: ${detail.slice(0, 200)}`,
    };
  }
  const data = (await res.json()) as {
    pay_token?: string;
    payment_url?: string;
    status?: string;
  };
  return {
    ok: true,
    mode: "live",
    providerReference: data.pay_token ?? null,
    paymentUrl: data.payment_url ?? null,
    status: data.status === "SUCCESS" ? "success" : "pending",
  };
}

/**
 * Déclenche une demande de paiement Mobile Money.
 * Bascule en mode démo si le provider n'est pas configuré.
 */
export async function initiateMobilePayment(
  config: RC,
  params: InitiateParams,
): Promise<InitiateResult> {
  const status = getProviderStatus(config);
  const configured = status[params.provider];

  if (!configured) {
    // Mode démo : aucun appel opérateur, on simule un paiement en attente.
    return {
      ok: true,
      mode: "demo",
      providerReference: `DEMO-${params.provider.toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`,
      status: "pending",
      message:
        "Mode démo : identifiants opérateur non configurés. Utilisez « Simuler » pour valider le flux.",
    };
  }

  try {
    if (params.provider === "mtn") return await initiateMtn(config, params);
    return await initiateOrange(config, params);
  } catch (err) {
    return {
      ok: false,
      mode: "live",
      providerReference: null,
      status: "failed",
      message: `Erreur provider: ${(err as Error).message}`,
    };
  }
}

export { getProviderStatus };
