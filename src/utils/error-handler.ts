/**
 * Helper centralizado para tratamento de erros
 * Padroniza respostas de erro e logging
 */

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

/**
 * Cria resposta de erro padronizada
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'Erro interno do servidor',
  statusCode: number = 500,
  code?: string
): { response: { statusCode: number; body: ErrorResponse }; logMessage: string } {
  const timestamp = new Date().toISOString();
  
  let errorMessage = defaultMessage;
  let errorDetails: any = undefined;
  
  if (error instanceof Error) {
    errorMessage = error.message || defaultMessage;
    errorDetails = {
      name: error.name,
      stack: error.stack,
    };
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    errorMessage = (error as any).message || defaultMessage;
    errorDetails = error;
  }

  const errorResponse: ErrorResponse = {
    error: errorMessage,
    code: code || `ERR_${statusCode}`,
    timestamp,
    ...(errorDetails && { details: errorDetails }),
  };

  const logMessage = `❌ [ErrorHandler] ${errorMessage}${code ? ` (${code})` : ''}`;

  return {
    response: {
      statusCode,
      body: errorResponse
    },
    logMessage,
  };
}

/**
 * Valida se um valor é um UUID válido
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Normaliza domínios de email comuns que podem ter erros de digitação
 */
export function normalizeEmailDomain(email: string): string {
  const domainCorrections: Record<string, string> = {
    'incloud.com': 'icloud.com',
    'gmial.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'hotmai.com': 'hotmail.com',
    'hotmial.com': 'hotmail.com',
    'hotmaiil.com': 'hotmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
  };

  const parts = email.split('@');
  if (parts.length !== 2) {
    return email;
  }

  const [localPart, domain] = parts;
  const normalizedDomain = domainCorrections[domain.toLowerCase()] || domain;

  return `${localPart}@${normalizedDomain}`;
}

/**
 * Normaliza um email: remove espaços, converte para lowercase e corrige domínios comuns
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  let normalized = email
    .replace(/[<>'"&]/g, '')
    .trim()
    .toLowerCase();
  
  normalized = normalizeEmailDomain(normalized);
  
  return normalized;
}

/**
 * Valida se um email é válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
