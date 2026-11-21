# SPRITEFORGE STUDIO — Backend Mercado Pago

Backend Next.js 15 para Vercel, com servidor MCP Streamable HTTP, consulta de assinaturas recorrentes do Mercado Pago e endpoint de webhook.

**Desenvolvimento:** Julio Cesar Campos Machado  
**Empresa:** LIKE LOOK SOLUTIONS  
**Site:** https://likelook.wixsite.com/solutions

## Estado confirmado em produção

Domínio principal: https://spriteforge-mercadopago.vercel.app/

Testes executados no domínio principal em 20/11/2026 (horários retornados pelo servidor em UTC):

| Verificação | Evidência | Resultado |
|---|---|---|
| Health | `GET /api/health` respondeu HTTP 200 e JSON `status: online` | PASS |
| MCP sem Bearer | `GET/POST /api/mcp` sem credencial respondeu HTTP 401 | PASS |
| MCP initialize autenticado | JSON-RPC `initialize`, protocolo `2025-03-26`, respondeu HTTP 200 em SSE | PASS |
| Inicialização concluída | `notifications/initialized` respondeu HTTP 202 | PASS |
| Descoberta de ferramentas | `tools/list` respondeu HTTP 200 e listou `spriteforge_check_subscription` | PASS |
| Execução da ferramenta | `tools/call` respondeu HTTP 200 com resultado estruturado | PASS |
| Consulta do e-mail de teste | Resultado `not_found`, sem assinatura correspondente localizada | NOT FOUND (consulta executada) |
| Webhook sem assinatura | POST sem assinatura válida respondeu HTTP 401 | PASS |

**Limites da evidência:** esses testes comprovam a autenticação Bearer, a inicialização MCP, a descoberta e a execução da ferramenta no domínio principal. Não comprovam que os previews compartilham configuração, que uma assinatura paga existe, que o webhook válido foi processado, nem que o plugin ChatGPT esteja conectado ao MCP.

## Funcionalidades implementadas

- Servidor MCP HTTP em `/api/mcp`, usando `mcp-handler`.
- Ferramenta `spriteforge_check_subscription`, com entrada obrigatória `email`.
- Consulta `GET /preapproval/search` do Mercado Pago.
- Correspondência pelo e-mail do pagador e, opcionalmente, pelo `MP_PREAPPROVAL_PLAN_ID`.
- Identificação de assinatura com status `authorized`.
- Proteção do endpoint MCP por `Authorization: Bearer` e `SPRITEFORGE_MCP_SECRET`.
- Webhook com validação HMAC SHA-256 do cabeçalho `x-signature`.
- Endpoint de saúde `/api/health`.

## Limites de autorização e Premium

A consulta MCP é **somente informativa** nesta versão. Ela não concede acesso Premium: `identity_verified` e `access_granted` permanecem `false`.

Um contrato de assinatura com status `authorized` não prova, isoladamente, que a cobrança mais recente foi paga ou liquidada. A liberação definitiva deve considerar a situação dos pagamentos autorizados, atrasados, rejeitados, cancelados ou estornados, consultada diretamente na API autenticada do Mercado Pago.

O e-mail informado à ferramenta também não prova que a pessoa que está usando o ChatGPT controla aquele endereço. É necessário implementar OTP por e-mail, expiração, limite de tentativas, proteção contra abuso e sessão/licença persistente vinculada ao titular.

O webhook atual valida a assinatura e registra metadados mínimos nos logs. Ainda não consulta o recurso notificado, não persiste eventos em banco e não implementa idempotência. Portanto, não deve ser usado como gatilho isolado para liberar ou revogar Premium.

## Variáveis de ambiente

Configure na Vercel, sem inserir os valores no código ou no Git:

| Nome | Uso |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token privado do Mercado Pago |
| `MP_WEBHOOK_SECRET` | Segredo de assinatura dos Webhooks |
| `SPRITEFORGE_MCP_SECRET` | Bearer secret que protege o endpoint MCP |
| `MP_PREAPPROVAL_PLAN_ID` | Opcional; restringe a consulta a um plano |

O valor de `SPRITEFORGE_MCP_SECRET` deve ser armazenado sem o prefixo `Bearer `; o cliente autorizado acrescenta esse prefixo no cabeçalho HTTP. Após alterar variáveis, faça novo deploy. Nunca compartilhe esses segredos em conversas, prints, logs ou comandos com eco visível.

## Execução local

Requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha `.env.local` apenas localmente. Não faça commit desse arquivo.

Endpoints:
- Health: `http://localhost:3000/api/health`
- MCP: `http://localhost:3000/api/mcp`
- Webhook: `http://localhost:3000/api/webhooks/mercadopago`

## Protocolo MCP

Endpoint: `https://spriteforge-mercadopago.vercel.app/api/mcp`

Cabeçalhos usados nos testes:
```http
Authorization: Bearer <SPRITEFORGE_MCP_SECRET>
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2025-03-26
```

Ferramenta:
```json
{
  "name": "spriteforge_check_subscription",
  "arguments": {
    "email": "cliente@exemplo.com"
  }
}
```

O segredo Bearer é uma credencial de integração servidor-servidor. Não o coloque no plugin distribuído, no navegador ou em instruções acessíveis ao usuário final. A sessão autenticada do ChatGPT não fornece automaticamente o e-mail do usuário ao backend. Antes de conectar o plugin, confirme que o mecanismo de autenticação configurado no host consegue fornecer credenciais ao endpoint sem expor um segredo compartilhado.

## Webhook Mercado Pago

Cadastre no painel do Mercado Pago:
`https://spriteforge-mercadopago.vercel.app/api/webhooks/mercadopago`

Eventos relevantes incluem `subscription_preapproval` e `subscription_authorized_payment`. A notificação é um aviso; consulte a API autenticada para obter o estado definitivo do recurso. Antes de automatizar qualquer decisão, implemente persistência, idempotência, reconciliação e trilha de auditoria.

## Próximas etapas obrigatórias

- [ ] Criar ou identificar uma assinatura recorrente de teste no Mercado Pago.
- [ ] Confirmar o e-mail do pagador e o ID do plano; distinguir conta do vendedor de pagador.
- [ ] Validar cobrança recorrente e política para pagamentos pendentes, rejeitados, atrasados e cancelados.
- [ ] Implementar OTP por e-mail com expiração, limite de tentativas e proteção contra enumeração.
- [ ] Persistir usuários, verificações, licenças, eventos e estado de pagamento em banco.
- [ ] Implementar webhook com consulta do recurso, idempotência e reconciliação.
- [ ] Definir autenticação compatível com o conector ChatGPT; não distribuir o Bearer secret.
- [ ] Testar autorização, revogação e expiração de ponta a ponta.
- [ ] Só então habilitar a concessão de recursos Premium.

## Referências oficiais

- Busca de assinaturas: https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/search-preapproval/get
- Webhooks de assinaturas: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks
- MCP Handler Vercel: https://github.com/vercel-labs/mcp-handler
