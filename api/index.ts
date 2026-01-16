import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/app.js';

// Criar instância do app Fastify (singleton para reutilização)
let appInstance: any = null;

async function getApp() {
  if (!appInstance) {
    appInstance = await createApp();
    await appInstance.ready();
  }
  return appInstance;
}

// Handler para Vercel Serverless Functions
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    
    // Usar Fastify.inject para processar a requisição
    // Isso é a forma recomendada de usar Fastify em ambientes serverless
    const url = req.url || '/';
    const method = req.method || 'GET';
    
    // Preparar opções para inject
    const injectOptions: any = {
      method,
      url,
      headers: req.headers as any,
      query: req.query,
      payload: req.body,
    };
    
    // Processar através do Fastify
    const response = await app.inject(injectOptions);
    
    // Enviar resposta
    res.status(response.statusCode);
    
    // Copiar headers da resposta
    Object.keys(response.headers).forEach(key => {
      const value = response.headers[key];
      if (value) {
        res.setHeader(key, value);
      }
    });
    
    // Enviar body
    res.send(response.body);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
