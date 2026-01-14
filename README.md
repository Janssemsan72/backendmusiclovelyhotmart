# MusicLovely Backend

Backend API para o MusicLovely, construído com Fastify e TypeScript.

## Funcionalidades

- Webhooks de pagamento (Cakto e Hotmart)
- Geração de letras e áudio
- Integração com Supabase
- Health check endpoint

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

### Webhooks
- `POST /api/cakto/webhook` - Webhook do Cakto
- `POST /api/hotmart/webhook` - Webhook do Hotmart

### Checkout
- `POST /api/checkout/create` - Criar novo pedido

### Geração
- `POST /api/lyrics/generate` - Gerar letras
- `POST /api/audio/generate` - Gerar áudio
- `POST /api/suno/callback` - Callback do Suno

## Deploy

Este projeto está configurado para deploy no Railway. O arquivo `railway.json` contém as configurações necessárias.

## Licença

Proprietário - MusicLovely
