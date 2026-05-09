const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://api.clickpesa.com/third-parties";

// Always return HTTP 200 so supabase.functions.invoke() never throws.
// The caller checks { ok, error, data } fields.
function respond(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Check secrets ───────────────────────────────────────────────────
    const clientId = Deno.env.get("CLICKPESA_CLIENT_ID") ?? "";
    const clientSecret = Deno.env.get("CLICKPESA_CLIENT_SECRET") ?? "";

    if (!clientId || !clientSecret) {
      return respond({
        ok: false,
        stage: "secrets",
        error:
          "CLICKPESA_CLIENT_ID or CLICKPESA_CLIENT_SECRET is not set. Add them under Project Settings → Edge Functions → Secrets.",
      });
    }

    // ── 2. Get ClickPesa access token ──────────────────────────────────────
    // Auth is via headers: client-id and api-key (NOT a JSON body)
    const tokenRes = await fetch(`${BASE}/generate-token`, {
      method: "POST",
      headers: {
        "client-id": clientId,
        "api-key": clientSecret,
      },
    });

    const tokenText = await tokenRes.text();

    if (!tokenRes.ok) {
      return respond({
        ok: false,
        stage: "auth",
        clickpesaStatus: tokenRes.status,
        error: `ClickPesa auth failed (HTTP ${tokenRes.status})`,
        clickpesaBody: tokenText,
      });
    }

    let tokenJson: Record<string, unknown>;
    try {
      tokenJson = JSON.parse(tokenText);
    } catch {
      return respond({
        ok: false,
        stage: "auth_parse",
        error: "ClickPesa token response was not valid JSON",
        clickpesaBody: tokenText,
      });
    }

    // ClickPesa may return token under different keys
    const token = (tokenJson.token ??
      tokenJson.accessToken ??
      tokenJson.access_token) as string | undefined;

    if (!token) {
      return respond({
        ok: false,
        stage: "auth_token_field",
        error: "No token field found in ClickPesa auth response",
        clickpesaBody: tokenJson,
      });
    }

    // ── 3. Parse request body ──────────────────────────────────────────────
    const body = await req.json();
    const {
      method,
      amount,
      orderReference,
      currency = "TZS",
      phoneNumber,
      network,
      accountNumber,
      accountName,
      bic,
      transferType,
    } = body;

    // ── 4. Build ClickPesa payout request ──────────────────────────────────
    let endpoint: string;
    let payoutPayload: Record<string, unknown>;

    if (method === "mobile_money") {
      endpoint = `${BASE}/payouts/create-mobile-money-payout`;
      payoutPayload = {
        amount: Number(amount),
        orderReference,
        phoneNumber,
        currency,
      };
    } else if (method === "bank") {
      endpoint = `${BASE}/payouts/create-bank-payout`;
      payoutPayload = {
        amount: Number(amount),
        orderReference,
        accountNumber,
        accountName,
        currency,
        bic,
        transferType,
      };
    } else {
      return respond({
        ok: false,
        stage: "validation",
        error: `Unknown payout method: "${method}". Use "mobile_money" or "bank".`,
      });
    }

    // ── 5. Call ClickPesa payout API ───────────────────────────────────────
    // The token returned by ClickPesa already includes the "Bearer " prefix
    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    const payoutRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payoutPayload),
    });

    const payoutText = await payoutRes.text();
    let payoutJson: unknown;
    try {
      payoutJson = JSON.parse(payoutText);
    } catch {
      payoutJson = { raw: payoutText };
    }

    if (!payoutRes.ok) {
      return respond({
        ok: false,
        stage: "payout",
        clickpesaStatus: payoutRes.status,
        error: `ClickPesa payout rejected (HTTP ${payoutRes.status})`,
        clickpesaBody: payoutJson,
      });
    }

    // ── 6. Success ─────────────────────────────────────────────────────────
    return respond({ ok: true, data: payoutJson });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return respond({ ok: false, stage: "exception", error: message });
  }
});
