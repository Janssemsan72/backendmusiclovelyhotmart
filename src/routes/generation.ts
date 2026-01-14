import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { getSecureHeaders } from '../utils/security.js';
import { 
  sanitizeError, 
  isRetryableError, 
  extractErrorDetails,
  isHtmlError 
} from '../utils/errorSanitizer.js';

export async function generationRoutes(app: FastifyInstance) {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // POST /api/lyrics/generate
  app.post('/api/lyrics/generate', async (request, reply) => {
    const origin = request.headers.origin || null;
    const secureHeaders = getSecureHeaders(origin);
    
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
      });

      const body: any = request.body;
      
      // Proxy para Edge Function do Supabase
      const { data, error } = await supabaseClient.functions.invoke('generate-lyrics-internal', {
        body: body
      });

      if (error) {
        console.error('❌ [generate-lyrics] Erro na Edge Function:', error);
        return reply
          .code(500)
          .headers(secureHeaders)
          .send({ success: false, error: error.message });
      }

      return reply
        .code(200)
        .headers(secureHeaders)
        .send(data || { success: true });

    } catch (error: any) {
      console.error('❌ [generate-lyrics] Erro inesperado:', error);
      return reply
        .code(500)
        .headers(secureHeaders)
        .send({ success: false, error: error?.message || 'Unknown error' });
    }
  });

  /**
   * Função de retry com backoff exponencial para chamadas à Edge Function
   */
  async function invokeWithRetry(
    supabaseClient: any,
    functionName: string,
    body: any,
    maxRetries: number = 3
  ): Promise<{ data: any; error: any }> {
    let lastError: any = null;
    let lastData: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseClient.functions.invoke(functionName, {
          body: body
        });

        // Se não houver erro, retornar sucesso
        if (!error) {
          if (attempt > 1) {
            console.log(`✅ [${functionName}] Sucesso na tentativa ${attempt} após ${attempt - 1} falha(s)`);
          }
          return { data, error: null };
        }

        // Extrair detalhes do erro para análise
        const errorDetails = extractErrorDetails(error);
        lastError = error;
        lastData = data;

        // Log estruturado da tentativa
        const logContext = {
          timestamp: new Date().toISOString(),
          function: functionName,
          attempt,
          maxRetries,
          errorType: errorDetails.status?.toString() || 'unknown',
          errorMessage: errorDetails.message,
          isHtml: errorDetails.isHtml,
          isRetryable: errorDetails.isRetryable,
        };

        console.error(`❌ [${functionName}] Tentativa ${attempt}/${maxRetries} falhou:`, logContext);

        // Se não for retryable, não tentar novamente
        if (!errorDetails.isRetryable) {
          console.log(`⚠️ [${functionName}] Erro não é retryable, interrompendo tentativas`);
          return { data: null, error };
        }

        // Se for a última tentativa, retornar erro
        if (attempt === maxRetries) {
          console.error(`❌ [${functionName}] Todas as ${maxRetries} tentativas falharam`);
          return { data: null, error };
        }

        // Calcular delay com backoff exponencial (1s, 2s, 4s)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ [${functionName}] Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (err: any) {
        lastError = err;
        const errorDetails = extractErrorDetails(err);
        
        const logContext = {
          timestamp: new Date().toISOString(),
          function: functionName,
          attempt,
          maxRetries,
          errorType: 'exception',
          errorMessage: errorDetails.message,
          isRetryable: errorDetails.isRetryable,
        };

        console.error(`❌ [${functionName}] Exceção na tentativa ${attempt}/${maxRetries}:`, logContext);

        // Se não for retryable ou for última tentativa, retornar erro
        if (!errorDetails.isRetryable || attempt === maxRetries) {
          return { data: null, error: err };
        }

        // Calcular delay com backoff exponencial
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ [${functionName}] Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Não deveria chegar aqui, mas por segurança
    return { data: lastData, error: lastError };
  }

  // POST /api/audio/generate
  app.post('/api/audio/generate', async (request, reply) => {
    const origin = request.headers.origin || null;
    const secureHeaders = getSecureHeaders(origin);
    
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
      });

      const body: any = request.body;
      
      // ✅ Chamar Edge Function com retry automático
      const { data, error } = await invokeWithRetry(
        supabaseClient,
        'generate-audio-internal',
        body,
        3 // 3 tentativas + 1 inicial = 4 total
      );

      if (error) {
        // ✅ Sanitizar erro antes de retornar
        const sanitizedError = sanitizeError(error);
        const errorDetails = extractErrorDetails(error);
        
        // Log estruturado do erro final
        console.error('❌ [generate-audio] Erro final após todas as tentativas:', {
          timestamp: new Date().toISOString(),
          function: 'generate-audio-internal',
          errorType: errorDetails.status?.toString() || 'unknown',
          errorMessage: sanitizedError,
          isHtml: errorDetails.isHtml,
          originalError: errorDetails.message,
        });

        // ✅ Mensagem de erro melhorada baseada no tipo
        let userMessage = sanitizedError;
        
        if (errorDetails.isHtml && errorDetails.status === 502) {
          userMessage = 'Serviço do Suno temporariamente indisponível. Tente novamente em alguns instantes.';
        } else if (errorDetails.isRetryable) {
          userMessage = 'Não foi possível conectar ao serviço do Suno após várias tentativas. Por favor, tente novamente mais tarde.';
        }

        return reply
          .code(500)
          .headers(secureHeaders)
          .send({ 
            success: false, 
            error: userMessage,
            errorDetails: process.env.NODE_ENV === 'development' ? {
              original: sanitizedError,
              status: errorDetails.status,
              isRetryable: errorDetails.isRetryable,
            } : undefined
          });
      }

      return reply
        .code(200)
        .headers(secureHeaders)
        .send(data || { success: true });

    } catch (error: any) {
      // ✅ Sanitizar erro inesperado também
      const sanitizedError = sanitizeError(error);
      const errorDetails = extractErrorDetails(error);
      
      console.error('❌ [generate-audio] Erro inesperado:', {
        timestamp: new Date().toISOString(),
        function: 'generate-audio-internal',
        errorType: 'unexpected',
        errorMessage: sanitizedError,
        originalError: error?.message || String(error),
      });

      return reply
        .code(500)
        .headers(secureHeaders)
        .send({ 
          success: false, 
          error: sanitizedError || 'Erro desconhecido ao processar geração de áudio'
        });
    }
  });

  // POST /api/suno/callback
  app.post('/api/suno/callback', async (request, reply) => {
    const origin = request.headers.origin || null;
    const secureHeaders = getSecureHeaders(origin);
    
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
      });

      const body: any = request.body;
      
      // Proxy para Edge Function do Supabase
      const { data, error } = await supabaseClient.functions.invoke('suno-callback', {
        body: body
      });

      if (error) {
        console.error('❌ [suno-callback] Erro na Edge Function:', error);
        return reply
          .code(500)
          .headers(secureHeaders)
          .send({ success: false, error: error.message });
      }

      return reply
        .code(200)
        .headers(secureHeaders)
        .send(data || { success: true });

    } catch (error: any) {
      console.error('❌ [suno-callback] Erro inesperado:', error);
      return reply
        .code(500)
        .headers(secureHeaders)
        .send({ success: false, error: error?.message || 'Unknown error' });
    }
  });
}
