import Fastify from 'fastify';
import cors from '@fastify/cors';
import { paymentRoutes } from './routes/payment.js';
import { generationRoutes } from './routes/generation.js';

// #region agent log
const LOG_ENDPOINT = 'http://127.0.0.1:7244/ingest/08412bf1-75eb-4fbc-b0f3-f947bf663281';
const log = (location: string, message: string, data: any, hypothesisId: string) => {
  fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    })
  }).catch(() => {});
};
// #endregion

// Função para criar instância do app (reutilizável)
export async function createApp() {
  // #region agent log
  log('app.ts:10', 'Iniciando createApp', {}, 'H1');
  // #endregion
  const app = Fastify({ logger: true });

  // #region agent log
  log('app.ts:14', 'Registrando rota /health', {}, 'H3');
  // #endregion
  // Healthcheck para a Railway - DEVE SER A PRIMEIRA ROTA REGISTRADA
  app.get('/health', async (_request, reply) => {
    // #region agent log
    log('app.ts:18', 'Healthcheck endpoint chamado', { headers: Object.keys(_request.headers), host: _request.headers.host, origin: _request.headers.origin }, 'H3');
    // #endregion
    return reply.status(200).send({ status: 'ok' });
  });
  
  // #region agent log
  log('app.ts:23', 'Rota /health registrada', {}, 'H3');
  // #endregion

  // CORS - aceitar apenas frontend
  const isAllowedOrigin = (origin: string | undefined): boolean => {
    // ✅ CORREÇÃO RAILWAY: Permitir requisições sem origin em desenvolvimento
    if (!origin) {
      return process.env.NODE_ENV !== 'production';
    }
    
    const fixedOrigins = [
      'https://musiclovely.com',
      'https://www.musiclovely.com',
      'http://localhost:5173',
      'http://localhost:8084',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8084',
      'http://127.0.0.1:4173'
    ];
    
    if (fixedOrigins.includes(origin)) return true;
    
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;
    if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) return true;
    if (process.env.RAILWAY_PUBLIC_DOMAIN && origin === process.env.RAILWAY_PUBLIC_DOMAIN) return true;
    
    if (origin.includes('.vercel.app') && origin.startsWith('https://')) return true;
    
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    
    return false;
  };

  // #region agent log
  log('app.ts:48', 'Registrando CORS', {}, 'H5');
  // #endregion
  await app.register(cors, { 
    origin: (origin, callback) => {
      // #region agent log
      log('app.ts:51', 'CORS origin callback chamado', { origin: origin || 'sem origin', hasOrigin: !!origin }, 'H5');
      // #endregion
      // ✅ CORREÇÃO RAILWAY: Permitir requisições sem origin para healthchecks
      // Healthchecks do Railway não enviam origin header
      if (!origin) {
        // #region agent log
        log('app.ts:56', 'Permitindo requisição sem origin', { NODE_ENV: process.env.NODE_ENV }, 'H5');
        // #endregion
        // Permitir requisições sem origin (healthchecks do Railway)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[CORS] ✅ Requisição sem origin permitida (healthcheck)`);
        }
        callback(null, true);
        return;
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[CORS] Origin recebida: ${origin}`);
      }
      
      const isAllowed = isAllowedOrigin(origin);
      // #region agent log
      log('app.ts:70', 'Verificando origin permitida', { origin, isAllowed }, 'H5');
      // #endregion
      
      if (isAllowed) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[CORS] ✅ Origin permitida: ${origin}`);
        }
        callback(null, true);
      } else {
        // #region agent log
        log('app.ts:78', 'Origin bloqueada', { origin, NODE_ENV: process.env.NODE_ENV }, 'H5');
        // #endregion
        console.warn(`[CORS] ❌ Origin bloqueada: ${origin}`);
        if (process.env.NODE_ENV === 'production') {
          callback(new Error('Not allowed by CORS'), false);
        } else {
          callback(null, true);
        }
      }
    },
    credentials: true
  });
  
  // #region agent log
  log('app.ts:91', 'CORS registrado', {}, 'H5');
  // #endregion

  // #region agent log
  log('app.ts:95', 'Registrando rotas de pagamento e geração', {}, 'H1');
  // #endregion
  // Registrar rotas
  await app.register(paymentRoutes);
  await app.register(generationRoutes);

  // #region agent log
  log('app.ts:101', 'createApp concluído, retornando app', { hasApp: !!app }, 'H1');
  // #endregion
  return app;
}
