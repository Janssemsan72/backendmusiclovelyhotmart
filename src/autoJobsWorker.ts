/**
 * Worker de jobs autom├íticos: aprova├º├úo de letras (8s) e envio de releases (4s).
 * Invoca as Edge Functions do Supabase quando os flags em admin_auto_jobs est├úo ativos.
 * Iniciado junto com o servidor no Railway (mesmo processo).
 */

const LYRICS_INTERVAL_MS = 8000;
const RELEASE_INTERVAL_MS = 4000;

let lyricsIntervalId: ReturnType<typeof setInterval> | null = null;
let releaseIntervalId: ReturnType<typeof setInterval> | null = null;

function invoke(name: string, supabaseUrl: string, serviceKey: string): Promise<void> {
  const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${name}`;
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
    .then((res) => {
      if (!res.ok) {
        console.warn(`[AutoJobs] ${name} respondeu ${res.status}`);
      }
    })
    .catch((err) => {
      console.warn(`[AutoJobs] ${name} erro:`, (err as Error).message);
    });
}

export function startAutoJobsWorker(): void {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log('[AutoJobs] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY n├úo definidos; worker n├úo iniciado.');
    return;
  }

  if (lyricsIntervalId !== null || releaseIntervalId !== null) {
    console.log('[AutoJobs] Worker j├í est├í rodando.');
    return;
  }

  lyricsIntervalId = setInterval(() => {
    invoke('run-one-auto-approve-lyrics', supabaseUrl, serviceKey);
  }, LYRICS_INTERVAL_MS);

  releaseIntervalId = setInterval(() => {
    invoke('run-one-auto-release', supabaseUrl, serviceKey);
  }, RELEASE_INTERVAL_MS);

  const heartbeatMs = 60_000;
  setInterval(() => {
    console.log('[AutoJobs] Worker ativo (letras 8s, releases 4s).');
  }, heartbeatMs);

  console.log('[AutoJobs] Worker iniciado (letras a cada 8s, releases a cada 4s).');
}

export function stopAutoJobsWorker(): void {
  if (lyricsIntervalId !== null) {
    clearInterval(lyricsIntervalId);
    lyricsIntervalId = null;
  }
  if (releaseIntervalId !== null) {
    clearInterval(releaseIntervalId);
    releaseIntervalId = null;
  }
  console.log('[AutoJobs] Worker parado.');
}
