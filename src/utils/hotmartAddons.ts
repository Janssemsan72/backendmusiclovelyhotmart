export type HotmartAddonType = 'additional_version' | 'lyrics_pdf';

const MAIN_PRODUCT_IDS = new Set([
  '6840691',
  '7860075',
  '7880117',
  '7964106',
]);

function normalizeProductName(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function classifyHotmartAddon(input: {
  productId?: unknown;
  productName?: unknown;
  amountCents?: unknown;
  isOrderBump?: boolean;
  parentTransactionId?: unknown;
}): HotmartAddonType | null {
  const productId = String(input.productId ?? '').trim();
  if (productId && MAIN_PRODUCT_IDS.has(productId)) return null;

  const productName = normalizeProductName(input.productName);
  const amountCents = Number(input.amountCents ?? 0);
  const hasAddonSignal =
    input.isOrderBump === true ||
    Boolean(String(input.parentTransactionId ?? '').trim());

  if (
    productName.includes('nova vers') ||
    (amountCents === 1990 && hasAddonSignal)
  ) {
    return 'additional_version';
  }

  if (
    productName.includes('letra') ||
    (amountCents === 500 && hasAddonSignal)
  ) {
    return 'lyrics_pdf';
  }

  return null;
}

export function getHotmartParentTransactionId(
  purchase: Record<string, any>,
): string | null {
  const value =
    purchase.order_bump?.parent_purchase_transaction ??
    purchase.parent_purchase_transaction;
  const normalized = String(value ?? '').trim();
  return normalized || null;
}
