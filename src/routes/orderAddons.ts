import { createHash, timingSafeEqual } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { generateLyricsPdf } from '../utils/lyricsPdf.js';

const PDF_BUCKET = 'order-lyrics-pdfs';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const LOGO_URL =
  'https://www.fazminhamusica.com.br/logo-gravatar-preto-512x512.png';

let cachedLogoBytes: Uint8Array | null | undefined;

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

function extractLyrics(value: unknown, depth = 0): string {
  if (depth > 8 || value == null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      return extractLyrics(JSON.parse(trimmed), depth + 1) || trimmed;
    } catch {
      return trimmed;
    }
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => extractLyrics(item, depth + 1))
      .filter(Boolean)
      .join('\n\n');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of [
      'lyrics',
      'letra',
      'text',
      'content',
      'sections',
      'verses',
      'lines',
    ]) {
      const text = extractLyrics(record[key], depth + 1);
      if (text) return text;
    }
  }
  return '';
}

async function fetchLogo(): Promise<Uint8Array | null> {
  if (cachedLogoBytes !== undefined) return cachedLogoBytes;
  try {
    const response = await fetch(LOGO_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Logo HTTP ${response.status}`);
    cachedLogoBytes = new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    console.warn('[Lyrics PDF] Logo indisponível; usando monograma', error);
    cachedLogoBytes = null;
  }
  return cachedLogoBytes;
}

function downloadFilename(customerName: unknown): string {
  const normalized = String(customerName ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 48);
  return normalized
    ? `letra-personalizada-${normalized}.pdf`
    : 'letra-da-sua-musica.pdf';
}

export async function orderAddonRoutes(app: FastifyInstance) {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  app.post<{
    Params: { addonId: string };
  }>('/api/order-addons/:addonId/lyrics-pdf', async (request, reply) => {
    const bearer = request.headers.authorization
      ?.replace(/^Bearer\s+/i, '')
      .trim() ?? '';
    if (!serviceRoleKey || !bearer || !safeEqual(bearer, serviceRoleKey)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const addonId = request.params.addonId;
    const { data: addon, error: addonError } = await supabase
      .from('order_addons')
      .select('id, order_id, addon_type, status, metadata, paid_at')
      .eq('id', addonId)
      .maybeSingle();
    if (addonError) {
      request.log.error(addonError, 'Falha ao buscar adicional da letra');
      return reply.code(500).send({ error: 'Falha ao buscar adicional' });
    }
    if (
      !addon ||
      addon.addon_type !== 'lyrics_pdf' ||
      addon.status !== 'paid'
    ) {
      return reply.code(404).send({ error: 'Letra paga não encontrada' });
    }

    const [{ data: order, error: orderError }, { data: approval, error: approvalError }] =
      await Promise.all([
        supabase
          .from('orders')
          .select(
            'id, customer_email, cakto_customer_name, quiz_id, quizzes:quiz_id(about_who)',
          )
          .eq('id', addon.order_id)
          .maybeSingle(),
        supabase
          .from('lyrics_approvals')
          .select('lyrics, lyrics_preview, status, approved_at')
          .eq('order_id', addon.order_id)
          .eq('status', 'approved')
          .order('approved_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (orderError || !order) {
      request.log.error(orderError, 'Pedido do adicional não encontrado');
      return reply.code(404).send({ error: 'Pedido não encontrado' });
    }
    if (approvalError) {
      request.log.error(approvalError, 'Falha ao buscar letra aprovada');
      return reply.code(500).send({ error: 'Falha ao buscar letra aprovada' });
    }

    const lyrics =
      extractLyrics(approval?.lyrics) ||
      extractLyrics(approval?.lyrics_preview);
    if (!lyrics || /gerando letra/i.test(lyrics)) {
      return reply.code(409).send({ error: 'Letra ainda não está aprovada' });
    }

    const contentHash = createHash('sha256')
      .update(lyrics)
      .digest('hex');
    const metadata =
      addon.metadata && typeof addon.metadata === 'object'
        ? addon.metadata as Record<string, unknown>
        : {};
    const cachedPath =
      metadata.lyrics_pdf_content_hash === contentHash
        ? String(metadata.lyrics_pdf_storage_path ?? '')
        : '';
    const fileName = downloadFilename(order.cakto_customer_name);

    let storagePath = cachedPath;
    let generated = false;
    if (!storagePath) {
      storagePath =
        `${order.id}/${addon.id}-${contentHash.slice(0, 16)}.pdf`;
      const quiz = Array.isArray(order.quizzes)
        ? order.quizzes[0]
        : order.quizzes;
      const pdfBytes = await generateLyricsPdf({
        lyrics,
        customerName: order.cakto_customer_name,
        dedication:
          quiz && typeof quiz === 'object'
            ? String((quiz as { about_who?: unknown }).about_who ?? '')
            : '',
        logoBytes: await fetchLogo(),
      });
      const { error: uploadError } = await supabase.storage
        .from(PDF_BUCKET)
        .upload(
          storagePath,
          new Blob([pdfBytes], { type: 'application/pdf' }),
          {
            cacheControl: '31536000',
            contentType: 'application/pdf',
            upsert: false,
          },
        );
      if (uploadError && !/already exists/i.test(uploadError.message)) {
        request.log.error(uploadError, 'Falha ao armazenar PDF da letra');
        return reply.code(500).send({ error: 'Falha ao armazenar PDF' });
      }
      generated = true;

      const { error: metadataError } = await supabase
        .from('order_addons')
        .update({
          metadata: {
            ...metadata,
            lyrics_pdf_storage_path: storagePath,
            lyrics_pdf_content_hash: contentHash,
            lyrics_pdf_generated_at: new Date().toISOString(),
          },
        })
        .eq('id', addon.id);
      if (metadataError) {
        request.log.warn(metadataError, 'PDF criado, mas metadata não atualizada');
      }
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(PDF_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, {
        download: fileName,
      });
    if (signedError || !signed?.signedUrl) {
      request.log.error(signedError, 'Falha ao assinar PDF da letra');
      return reply.code(500).send({ error: 'Falha ao preparar download' });
    }

    return reply.send({
      ok: true,
      order_addon_id: addon.id,
      order_id: order.id,
      generated,
      content_type: 'application/pdf',
      file_name: fileName,
      storage_path: storagePath,
      download_url: signed.signedUrl,
      expires_in: SIGNED_URL_TTL_SECONDS,
    });
  });
}
