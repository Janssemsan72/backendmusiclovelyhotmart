// ✅ SEGURANÇA: Headers de segurança para backend
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://api.anthropic.com https://api.suno.ai; frame-src https://js.stripe.com https://checkout.stripe.com"
};

// ✅ SEGURANÇA: CORS restritivo para produção
export const ALLOWED_ORIGINS = [
  'https://musiclovely.com',
  'https://www.musiclovely.com',
  'http://localhost:8084',
  'http://localhost:5173',
  'http://localhost:4173', // Preview do Vite
  'http://localhost:8089',
  'http://127.0.0.1:8084',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:8089'
];

// Função para verificar se origin é permitida (incluindo domínios Vercel e variáveis de ambiente)
export const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  
  // Verificar origens fixas
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Verificar variáveis de ambiente
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;
  if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) return true;
  
  // Permitir qualquer domínio *.vercel.app (frontend em preview/produção na Vercel)
  if (origin.includes('.vercel.app') && origin.startsWith('https://')) return true;
  
  // Permitir localhost em desenvolvimento
  const isLocalhost = origin.startsWith('http://localhost:') || 
                      origin.startsWith('http://127.0.0.1:') ||
                      origin.startsWith('http://0.0.0.0:');
  
  return isLocalhost;
};

export const getCorsHeaders = (origin: string | null) => {
  // ✅ SEGURANÇA: Verificar se origin está permitida
  const allowed = isAllowedOrigin(origin);
  
  // Logging para debug (apenas em desenvolvimento)
  if (process.env.NODE_ENV !== 'production' && origin) {
    console.log(`[CORS Headers] Origin: ${origin}, Allowed: ${allowed}`);
  }
  
  return {
    'Access-Control-Allow-Origin': allowed ? (origin || ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400', // 24 horas
    'Access-Control-Allow-Credentials': 'true'
  };
};

// ✅ SEGURANÇA: Headers combinados (CORS + Security)
export const getSecureHeaders = (origin: string | null) => {
  return {
    ...getCorsHeaders(origin),
    ...securityHeaders
  };
};

// ✅ SEGURANÇA: Headers padrão
export const defaultSecureHeaders = {
  ...getCorsHeaders(ALLOWED_ORIGINS[0]),
  ...securityHeaders
};
