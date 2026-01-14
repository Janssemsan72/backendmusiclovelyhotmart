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
  'http://localhost:8089',
  'http://127.0.0.1:8084',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8089'
];

export const getCorsHeaders = (origin: string | null) => {
  // ✅ CORREÇÃO: Permitir qualquer localhost durante desenvolvimento
  const isLocalhost = origin && (
    origin.startsWith('http://localhost:') || 
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://0.0.0.0:')
  );
  
  // ✅ SEGURANÇA: Verificar se origin está na lista permitida ou é localhost
  const isAllowedOrigin = origin && (ALLOWED_ORIGINS.includes(origin) || isLocalhost);
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400', // 24 horas
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
