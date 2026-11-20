# SPRITEFORGE STUDIO — Backend Mercado Pago

Backend inicial em Next.js para deploy na Vercel. Desenvolvido para o SPRITEFORGE STUDIO.

**Autoria:** Julio Cesar Campos Machado  
**Empresa:** LIKE LOOK SOLUTIONS  
**Site:** https://likelook.wixsite.com/solutions

## O que está implementado

- Servidor MCP HTTP em `/api/mcp`.
- Ferramenta MCP `spriteforge_check_subscription`.
- Consulta `GET /preapproval/search? payer_email=...` no Mercado Pago.
- Considera `authorized` como assinatura autorizada; outros estados não qualificam.
- Filtro opcional por `MP_PREAPPROVAL_PLAN_ID`.
- Proteção do endpoint MCP por Bearer secret.
- Endpoint de webhook com validação HMAC SHA-256 da assinatura `x-signature`.
- Endpoint de saúde `/api/health`.

## Limitação importante desta versão

Esta é a primeira camada de consulta. Ela **não libera acesso Premium**. A ferramenta retorna `identity_verified: false` e `access_granted: false`, mesmo quando encontra assinatura autorizada.

Isso é intencional: consultar o e-mail no Mercado Pago não prova que a pessoa que está usando o ChatGPT controla aquele endereço. Para produção, a próxima etapa deve implementar código de confirmação por e-mail, persistência segura de sessão/licença (por exemplo, Supabase) e confirmação das cobranças recorrentes/estado da assinatura. O webhook atual valida e registra o recebimento nos logs, mas ainda não persiste eventos em banco.

Não use a resposta `premium_eligible` como autorização final de acesso nesta versão.

## Requisitos

- Node.js 20+
- Conta GitHub privada
- Projeto Vercel
- Credenciais do Mercado Pago
- Token MCP aleatório e longo

## Executar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure valores reais apenas no `.env.local` local (não faça commit) ou em Environment Variables da Vercel. Nunca coloque Access Token ou segredo em código, frontend ou GitHub.

Teste:
- `http://localhost:3000/api/health`
- MCP: `http://localhost:3000/api/mcp`

O endpoint MCP exige:
`Authorization: Bearer SEU_SPRITEFORGE_MCP_SECRET`

## Variáveis de ambiente na Vercel

| Nome | Tipo | Uso |
|---|---|---|
| `MP_ACCESS_TOKEN` | Secret | Access Token privado do Mercado Pago |
| `MP_WEBHOOK_SECRET` | Secret | Segredo de assinatura dos Webhooks |
| `SPRITEFORGE_MCP_SECRET` | Secret | Protege o endpoint MCP |
| `MP_PREAPPROVAL_PLAN_ID` | Opcional | ID do plano específico do SPRITEFORGE |

Após cadastrar/alterar variáveis, faça novo deploy.

## Webhook Mercado Pago

Depois do deploy, cadastre no painel do Mercado Pago:

`https://SEU-DOMINIO.vercel.app/api/webhooks/mercadopago`

Ative eventos relacionados a:
- `subscription_preapproval`
- `subscription_authorized_payment`

Copie o segredo de assinatura de Webhooks para `MP_WEBHOOK_SECRET` na Vercel. Não confunda esse segredo com o Access Token.

O endpoint valida o HMAC conforme a documentação do Mercado Pago. Não confie apenas no conteúdo do POST: a notificação serve para avisar que houve alteração; a API autenticada do Mercado Pago é a fonte de verdade.

## Ferramenta MCP

Nome: `spriteforge_check_subscription`

Entrada:
```json
{ "email": "cliente@exemplo.com" }
```

O servidor exige cabeçalho HTTP:
```http
Authorization: Bearer SEU_SPRITEFORGE_MCP_SECRET
```

## Antes de produção

- [ ] Configurar os quatro valores de ambiente na Vercel.
- [ ] Fazer deploy e testar `/api/health`.
- [ ] Testar consulta com conta/assinatura de teste do Mercado Pago.
- [ ] Confirmar o plano correto via `MP_PREAPPROVAL_PLAN_ID`.
- [ ] Implementar confirmação de e-mail e armazenamento persistente.
- [ ] Validar cobranças recorrentes e política de inadimplência.
- [ ] Conectar o endpoint MCP ao cliente ChatGPT com autenticação suportada.
- [ ] Não liberar Premium até concluir os itens de segurança.

## Referências oficiais

- Busca de assinaturas: https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/search-preapproval/get
- Webhooks de assinaturas: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks
- MCP Handler Vercel: https://github.com/vercel-labs/mcp-handler
