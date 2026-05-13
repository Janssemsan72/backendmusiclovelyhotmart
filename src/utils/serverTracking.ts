interface PurchaseEventParams {
  gaClientId: string;
  transactionId: string;
  value: number;
  currency: string;
  customerEmail: string;
}

/**
 * Envia evento Purchase server-side para o Stape GTM Server Container
 * via GA4 Measurement Protocol.
 *
 * Requer env vars: GA4_MEASUREMENT_ID e GA4_API_SECRET.
 * Endpoint proxied pelo Stape: https://musiclovely.online/mp/collect
 */
export async function sendPurchaseToStape(params: PurchaseEventParams): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn('[ServerTracking] GA4_MEASUREMENT_ID ou GA4_API_SECRET não configurados - pulando evento Purchase');
    return;
  }

  const endpoint = `https://musiclovely.online/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

  const payload = {
    client_id: params.gaClientId,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: params.transactionId,
          value: params.value,
          currency: params.currency,
          items: [
            {
              item_name: 'Música Personalizada',
              price: params.value,
              quantity: 1,
            },
          ],
        },
      },
    ],
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[ServerTracking] Erro ao enviar Purchase para Stape: ${response.status} ${response.statusText}`);
    } else {
      console.log(`[ServerTracking] Purchase enviado para Stape: order=${params.transactionId} value=${params.value} ${params.currency}`);
    }
  } catch (error) {
    console.error('[ServerTracking] Exceção ao enviar Purchase para Stape:', error);
  }
}
