import Fastify from 'fastify';
import cors from '@fastify/cors';
import { paymentRoutes } from './routes/payment.js';
import { generationRoutes } from './routes/generation.js';

// Função para criar instância do app (reutilizável)
export async function createApp() {
  const app = Fastify({ logger: true });

  // CORS - aceitar apenas frontend
  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return false;
    
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

  await app.register(cors, { 
    origin: (origin, callback) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[CORS] Origin recebida: ${origin}`);
      }
      
      if (isAllowedOrigin(origin)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[CORS] ✅ Origin permitida: ${origin}`);
        }
        callback(null, true);
      } else {
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

  // Health check
  app.get('/health', async (request, reply) => {
    return reply.status(200).send({ ok: true, timestamp: new Date().toISOString() });
  });

  // Registrar rotas
  await app.register(paymentRoutes);
  await app.register(generationRoutes);

  return app;
}
