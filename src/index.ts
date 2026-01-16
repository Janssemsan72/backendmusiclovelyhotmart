import { createApp } from './app.js';

// Criar e iniciar servidor (para Railway/local)
async function startServer() {
  try {
    console.log('[Server] Inicializando aplicação...');
    const app = await createApp();
    
    // Iniciar servidor apenas se não estiver em ambiente Vercel
    if (!process.env.VERCEL) {
      const port = Number(process.env.PORT) || 3000;
      console.log(`[Server] Tentando iniciar servidor na porta ${port}...`);
      
      await app.listen({ port, host: '0.0.0.0' });
      
      console.log(`[Server] ✅ Servidor rodando na porta ${port}`);
      console.log(`[Server] Health check disponível em http://0.0.0.0:${port}/health`);
    } else {
      console.log('[Server] Ambiente Vercel detectado - servidor não será iniciado');
    }
  } catch (error) {
    console.error('[Server] ❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();
