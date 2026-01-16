import Fastify from 'fastify'
import cors from '@fastify/cors'
import { paymentRoutes } from './routes/payment.js'
import { generationRoutes } from './routes/generation.js'

const app = Fastify({ logger: true })

// CORS - aceitar apenas frontend
// Função para verificar se origin é permitida (incluindo domínios Vercel)
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return false;
  
  // Lista de origens fixas permitidas
  const fixedOrigins = [
    'https://musiclovely.com',
    'https://www.musiclovely.com',
    'http://localhost:5173',
    'http://localhost:8084',
    'http://localhost:4173', // Preview do Vite
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8084',
    'http://127.0.0.1:4173'
  ];
  
  // Verificar origens fixas
  if (fixedOrigins.includes(origin)) return true;
  
  // Verificar variáveis de ambiente
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;
  if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) return true;
  if (process.env.RAILWAY_PUBLIC_DOMAIN && origin === process.env.RAILWAY_PUBLIC_DOMAIN) return true;
  
  // Permitir qualquer domínio *.vercel.app (frontend em preview/produção na Vercel)
  if (origin.includes('.vercel.app') && origin.startsWith('https://')) return true;
  
  // Permitir localhost em desenvolvimento
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  
  return false;
};

await app.register(cors, { 
  origin: (origin, callback) => {
    // Logging para debug de CORS
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
      // Em produção, retornar false para bloquear
      // Em desenvolvimento, permitir para debug
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'), false);
      } else {
        // Em dev, permitir para facilitar debug
        callback(null, true);
      }
    }
  },
  credentials: true
})

// Health check
app.get('/health', async () => ({ ok: true, timestamp: new Date().toISOString() }))

// Registrar rotas
await app.register(paymentRoutes)
await app.register(generationRoutes)

// Iniciar servidor
const port = Number(process.env.PORT) || 3000
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 Backend rodando na porta ${port}`)
  }
})
