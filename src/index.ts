import { createApp } from './app.js';

// Criar e iniciar servidor (para Railway/local)
const app = await createApp();

// Iniciar servidor apenas se não estiver em ambiente Vercel
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;
  app.listen({ port, host: '0.0.0.0' }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚀 Backend rodando na porta ${port}`);
    }
  });
}
