import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { checkSubscription } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcpHandler = createMcpHandler((server) => {
  server.registerTool(
    "spriteforge_check_subscription",
    {
      title: "Verificar assinatura SPRITEFORGE",
      description:
        "Consulta no Mercado Pago se existe assinatura recorrente autorizada do SPRITEFORGE STUDIO para o e-mail informado. Retorna dados de diagnóstico da busca. Não comprova a quitação da cobrança mais recente, não verifica a identidade do usuário e nunca concede acesso Premium.",
      inputSchema: z.object({
        email: z.string().email().max(254)
      })
    },
    async ({ email }) => {
      try {
        const result = await checkSubscription(email);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro inesperado.";
        return {
          isError: true,
          content: [{ type: "text", text: `Falha ao consultar assinatura: ${message}` }]
        };
      }
    }
  );
}, {
  serverInfo: {
    name: "spriteforge-mercadopago",
    version: "1.0.1"
  }
});

function isAuthorized(request: Request) {
  const expected = process.env.SPRITEFORGE_MCP_SECRET;
  if (!expected) return false;

  const authorization = request.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (supplied.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < supplied.length; i++) {
    mismatch |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

async function guardedHandler(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "Não autorizado. Informe o token MCP no cabeçalho Authorization: Bearer." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  return mcpHandler(request);
}

export { guardedHandler as GET, guardedHandler as POST };
