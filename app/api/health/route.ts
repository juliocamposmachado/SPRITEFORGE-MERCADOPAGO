export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    service: "spriteforge-mercadopago-backend",
    status: "online",
    version: "1.0.1",
    timestamp: new Date().toISOString()
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
