import { createApp } from './app.js';

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

// Criar e iniciar servidor (para Railway/local)
async function startServer() {
  try {
    // #region agent log
    log('index.ts:8', 'Iniciando startServer', { VERCEL: process.env.VERCEL, PORT: process.env.PORT, NODE_ENV: process.env.NODE_ENV }, 'H1');
    // #endregion
    console.log('[Server] Inicializando aplicação...');
    console.log('[DEBUG] Environment:', { VERCEL: process.env.VERCEL, PORT: process.env.PORT, NODE_ENV: process.env.NODE_ENV });
    
    // #region agent log
    log('index.ts:12', 'Chamando createApp', {}, 'H1');
    // #endregion
    const app = await createApp();
    
    // #region agent log
    log('index.ts:15', 'createApp concluído', { hasApp: !!app, appReady: app?.server?.listening }, 'H1');
    // #endregion
    
    // ✅ CORREÇÃO RAILWAY: Garantir que app está pronto antes de iniciar
    // #region agent log
    log('index.ts:19', 'Chamando app.ready', {}, 'H4');
    // #endregion
    await app.ready();
    
    // #region agent log
    log('index.ts:22', 'app.ready concluído', { serverListening: app.server?.listening }, 'H4');
    // #endregion
    console.log('[Server] ✅ Aplicação pronta para receber requisições');
    
    // Iniciar servidor apenas se não estiver em ambiente Vercel
    if (!process.env.VERCEL) {
      const port = Number(process.env.PORT) || 3000;
      // #region agent log
      log('index.ts:28', 'Configurando porta', { port, PORT_ENV: process.env.PORT, portType: typeof port }, 'H2');
      // #endregion
      console.log(`[Server] Tentando iniciar servidor na porta ${port}...`);
      console.log(`[Server] PORT environment variable: ${process.env.PORT || 'não definida (usando 3000)'}`);
      
      // #region agent log
      log('index.ts:33', 'Chamando app.listen', { port, host: '0.0.0.0' }, 'H2');
      // #endregion
      await app.listen({ port, host: '0.0.0.0' });
      
      // #region agent log
      log('index.ts:36', 'app.listen concluído', { serverListening: app.server?.listening, serverAddress: app.server?.address() }, 'H2');
      // #endregion
      console.log(`[Server] ✅ Servidor rodando na porta ${port}`);
      console.log(`[Server] ✅ Health check disponível em http://0.0.0.0:${port}/health`);
      console.log(`[Server] ✅ Servidor pronto para receber requisições`);
      console.log('[DEBUG] Server state:', { 
        listening: app.server?.listening, 
        address: app.server?.address(),
        port: port,
        host: '0.0.0.0'
      });
    } else {
      console.log('[Server] Ambiente Vercel detectado - servidor não será iniciado');
    }
  } catch (error) {
    // #region agent log
    log('index.ts:44', 'Erro capturado em startServer', { errorMessage: error instanceof Error ? error.message : String(error), errorStack: error instanceof Error ? error.stack : undefined }, 'H1');
    // #endregion
    console.error('[Server] ❌ Erro ao iniciar servidor:', error);
    if (error instanceof Error) {
      console.error('[Server] ❌ Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Iniciar servidor
// #region agent log
log('index.ts:52', 'Chamando startServer', {}, 'H1');
// #endregion
startServer();
