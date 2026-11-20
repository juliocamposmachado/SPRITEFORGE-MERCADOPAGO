import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyMercadoPagoSignature(request: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const signatureHeader = request.headers.get("x-signature") || "";
  const requestId = request.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    })
  );

  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash || !requestId || !dataId) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    const a = Buffer.from(expectedHash, "hex");
    const b = Buffer.from(receivedHash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({})) as {
    type?: string;
    action?: string;
    data?: { id?: string | number };
  };

  const dataId = String(
    url.searchParams.get("data.id") ||
    body.data?.id ||
    ""
  );

  if (!verifyMercadoPagoSignature(request, dataId)) {
    return Response.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
  }

  const eventType = body.type || url.searchParams.get("type") || "unknown";

  // A notificação é autenticada. O estado definitivo deve ser consultado
  // novamente na API do Mercado Pago antes de qualquer decisão de acesso.
  // Persistência/auditoria de eventos será ligada ao banco na próxima etapa.
  console.info("SPRITEFORGE_MP_WEBHOOK_VERIFIED", {
    eventType,
    action: body.action || null,
    dataId,
    receivedAt: new Date().toISOString()
  });

  return Response.json({ received: true });
}
