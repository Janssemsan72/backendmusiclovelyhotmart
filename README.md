# MusicLovely Backend

Backend API para o MusicLovely, construído com Fastify e TypeScript.

## Funcionalidades

- Webhooks de pagamento (Cakto e Hotmart)
- Geração de letras e áudio
- Integração com Supabase
- Health check endpoint
- Criação de pedidos via API

## Requisitos

- Node.js >= 18.0.0
- npm ou yarn

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

## Build

```bash
npm run build
```

## Produção

```bash
npm start
```

## Variáveis de Ambiente

Crie um arquivo `.env` com as seguintes variáveis:

```env
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
CAKTO_WEBHOOK_SECRET=seu-secret-cakto
HOTMART_WEBHOOK_SECRET=seu-secret-hotmart
FRONTEND_URL=https://seu-frontend.com
NODE_ENV=production
```

## Endpoints

### Health Check

- `GET /health` - Verifica se o servidor está rodando

**Resposta:**
```json
{
  "ok": true,
  "timestamp": "2026-01-14T19:00:00.000Z"
}
```

### Webhooks

- `POST /api/cakto/webhook` - Webhook do Cakto
- `POST /api/hotmart/webhook` - Webhook do Hotmart

### Checkout

- `POST /api/checkout/create` - Criar novo pedido

**Body:**
```json
{
  "session_id": "uuid",
  "quiz": {
    "about_who": "string",
    "style": "string",
    ...
  },
  "customer_email": "email@example.com",
  "customer_whatsapp": "+5511999999999",
  "plan": "standard" | "express",
  "amount_cents": 10000,
  "provider": "cakto" | "hotmart",
  "transaction_id": "optional"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "quiz_id": "uuid",
  "order_id": "uuid",
  "log_id": "uuid"
}
```

### Geração

- `POST /api/lyrics/generate` - Gerar letras
- `POST /api/audio/generate` - Gerar áudio
- `POST /api/suno/callback` - Callback do Suno

## Estrutura do Projeto

```
src/
├── index.ts              # Ponto de entrada do servidor
├── routes/
│   ├── payment.ts       # Rotas de pagamento e webhooks
│   └── generation.ts    # Rotas de geração de conteúdo
└── utils/
    ├── security.ts      # Headers de segurança e CORS
    ├── error-handler.ts # Tratamento de erros
    └── errorSanitizer.ts # Sanitização de erros
```

## Deploy

Este projeto está configurado para deploy no Railway. O arquivo `railway.json` contém as configurações necessárias.

### Railway

1. Conecte o repositório ao Railway
2. Configure as variáveis de ambiente
3. O deploy será automático

### Outros Plataformas

O projeto pode ser deployado em qualquer plataforma que suporte Node.js:
- Heroku
- Render
- DigitalOcean App Platform
- AWS Lambda (com adaptações)

## Segurança

- Headers de segurança configurados
- CORS restritivo
- Validação de webhooks via secrets
- Sanitização de erros
- Validação de UUIDs

## Logs

O servidor utiliza logging estruturado do Fastify. Em produção, os logs são enviados para:
- Console (stdout/stderr)
- Plataforma de deploy (Railway logs)

## Licença

Proprietário - MusicLovely
