/**
 * Utilitário para sanitizar e tratar erros, especialmente erros HTML retornados por APIs
 */

/**
 * Detecta se uma string contém HTML
 */
export function isHtmlError(error: string): boolean {
  if (!error || typeof error !== 'string') return false;
  
  // Verificar padrões comuns de HTML
  const htmlPatterns = [
    /<!DOCTYPE/i,
    /<html/i,
    /<head/i,
    /<body/i,
    /<title/i,
    /<\/[^>]+>/,
  ];
  
  return htmlPatterns.some(pattern => pattern.test(error));
}

/**
 * Extrai informações úteis de um erro HTML
 */
export function extractErrorInfo(html: string): { status: number; message: string } {
  let status = 502;
  let message = 'Bad Gateway';
  
  try {
    // Tentar extrair status code do título ou do conteúdo
    const statusMatch = html.match(/(\d{3}):\s*([^<]+)/i) || 
                       html.match(/<title[^>]*>.*?(\d{3}):\s*([^<]+).*?<\/title>/i);
    
    if (statusMatch) {
      status = parseInt(statusMatch[1], 10) || 502;
      message = statusMatch[2]?.trim() || 'Bad Gateway';
    } else {
      // Tentar extrair do título
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        const title = titleMatch[1];
        const titleStatusMatch = title.match(/(\d{3})/);
        if (titleStatusMatch) {
          status = parseInt(titleStatusMatch[1], 10) || 502;
        }
        message = title.replace(/\d{3}:\s*/i, '').trim() || 'Bad Gateway';
      }
    }
    
    // Limpar a mensagem de caracteres especiais HTML
    message = message
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
      
  } catch (err) {
    console.error('Erro ao extrair informações do HTML:', err);
  }
  
  return { status, message };
}

/**
 * Remove tags HTML e mantém apenas texto útil
 */
function stripHtmlTags(html: string): string {
  try {
    // Remover tags HTML
    let text = html.replace(/<[^>]+>/g, ' ');
    
    // Remover entidades HTML comuns
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    
    // Limpar espaços múltiplos
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  } catch (err) {
    return html;
  }
}

/**
 * Trunca uma string se for muito longa
 */
function truncateError(error: string, maxLength: number = 500): string {
  if (error.length <= maxLength) return error;
  return error.substring(0, maxLength) + '... (truncado)';
}

/**
 * Sanitiza qualquer tipo de erro, retornando uma string limpa e útil
 */
export function sanitizeError(error: any): string {
  if (!error) return 'Erro desconhecido';
  
  // Se for string
  if (typeof error === 'string') {
    // Se for HTML, extrair informações úteis
    if (isHtmlError(error)) {
      const { status, message } = extractErrorInfo(error);
      return `Erro ${status}: ${message}`;
    }
    
    // Se for muito longo, truncar
    return truncateError(error);
  }
  
  // Se for objeto Error
  if (error instanceof Error) {
    return truncateError(error.message || 'Erro desconhecido');
  }
  
  // Se for objeto com propriedades
  if (typeof error === 'object') {
    // Priorizar mensagem de erro
    if (error.message) {
      const message = typeof error.message === 'string' 
        ? error.message 
        : String(error.message);
      
      if (isHtmlError(message)) {
        const { status, message: cleanMessage } = extractErrorInfo(message);
        return `Erro ${status}: ${cleanMessage}`;
      }
      
      return truncateError(message);
    }
    
    // Tentar extrair erro de propriedades comuns
    if (error.error) {
      return sanitizeError(error.error);
    }
    
    // Se tiver status e mensagem
    if (error.status && error.statusText) {
      return `Erro ${error.status}: ${error.statusText}`;
    }
    
    // Tentar stringify (limitado)
    try {
      const stringified = JSON.stringify(error);
      return truncateError(stringified);
    } catch {
      return 'Erro desconhecido (objeto não serializável)';
    }
  }
  
  // Fallback
  return truncateError(String(error));
}

/**
 * Detecta se um erro é temporário e pode ser retentado
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // Verificar status code
  const status = error.status || error.statusCode;
  if (status) {
    // Erros temporários do servidor (502, 503, 504)
    if (status >= 502 && status <= 504) return true;
    // Timeout (408)
    if (status === 408) return true;
    // Não retentar erros de autenticação ou cliente
    if (status >= 400 && status < 500) return false;
  }
  
  // Verificar mensagem de erro
  const message = error.message || String(error);
  if (typeof message === 'string') {
    const lowerMessage = message.toLowerCase();
    
    // Padrões que indicam erro temporário
    const retryablePatterns = [
      /bad gateway/i,
      /service unavailable/i,
      /gateway timeout/i,
      /timeout/i,
      /temporarily unavailable/i,
      /try again/i,
      /network error/i,
      /connection.*refused/i,
      /econnrefused/i,
    ];
    
    if (retryablePatterns.some(pattern => pattern.test(lowerMessage))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extrai informações estruturadas de um erro para logs
 */
export function extractErrorDetails(error: any): {
  type: string;
  status?: number;
  message: string;
  isHtml: boolean;
  isRetryable: boolean;
} {
  const sanitized = sanitizeError(error);
  const status = error?.status || error?.statusCode;
  const message = error?.message || String(error);
  
  return {
    type: error?.name || 'Error',
    status,
    message: sanitized,
    isHtml: typeof message === 'string' ? isHtmlError(message) : false,
    isRetryable: isRetryableError(error),
  };
}
