import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 58;
const BODY_TOP = 690;
const BODY_BOTTOM = 72;

const COLORS = {
  cream: rgb(1, 0.976, 0.941),
  paper: rgb(1, 0.997, 0.988),
  terracotta: rgb(0.78, 0.39, 0.2),
  terracottaSoft: rgb(0.94, 0.78, 0.65),
  gold: rgb(0.83, 0.61, 0.32),
  brown: rgb(0.22, 0.14, 0.11),
  muted: rgb(0.47, 0.39, 0.35),
  white: rgb(1, 1, 1),
};

function pdfSafeText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, '');
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const words = pdfSafeText(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function drawPageFrame(
  page: PDFPage,
  pageNumber: number,
  fonts: { sans: PDFFont; sansBold: PDFFont; serif: PDFFont },
  logo?: PDFImage,
): void {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: COLORS.paper,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 112,
    width: PAGE_WIDTH,
    height: 112,
    color: COLORS.cream,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 8,
    width: PAGE_WIDTH,
    height: 8,
    color: COLORS.terracotta,
  });
  page.drawLine({
    start: { x: MARGIN_X, y: PAGE_HEIGHT - 112 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 112 },
    thickness: 1,
    color: COLORS.terracottaSoft,
  });

  if (logo) {
    const size = 54;
    page.drawImage(logo, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 88,
      width: size,
      height: size,
    });
  } else {
    page.drawCircle({
      x: MARGIN_X + 27,
      y: PAGE_HEIGHT - 61,
      size: 27,
      color: COLORS.terracotta,
    });
    page.drawText('FMM', {
      x: MARGIN_X + 10,
      y: PAGE_HEIGHT - 66,
      font: fonts.sansBold,
      size: 12,
      color: COLORS.white,
    });
  }

  page.drawText('FAZ MINHA MUSICA', {
    x: MARGIN_X + 68,
    y: PAGE_HEIGHT - 56,
    font: fonts.sansBold,
    size: 15,
    color: COLORS.brown,
  });
  page.drawText('Historias que viram cancao', {
    x: MARGIN_X + 68,
    y: PAGE_HEIGHT - 76,
    font: fonts.serif,
    size: 10,
    color: COLORS.muted,
  });

  page.drawLine({
    start: { x: MARGIN_X, y: 52 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: 52 },
    thickness: 0.7,
    color: COLORS.terracottaSoft,
  });
  page.drawText('www.fazminhamusica.com.br', {
    x: MARGIN_X,
    y: 34,
    font: fonts.sans,
    size: 8,
    color: COLORS.muted,
  });
  const pageLabel = `Pagina ${pageNumber}`;
  page.drawText(pageLabel, {
    x:
      PAGE_WIDTH -
      MARGIN_X -
      fonts.sans.widthOfTextAtSize(pageLabel, 8),
    y: 34,
    font: fonts.sans,
    size: 8,
    color: COLORS.muted,
  });
}

export async function generateLyricsPdf(input: {
  lyrics: string;
  customerName?: string | null;
  dedication?: string | null;
  logoBytes?: Uint8Array | null;
}): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle('Letra da Sua Musica Personalizada');
  document.setAuthor('Faz Minha Musica');
  document.setCreator('Faz Minha Musica');
  document.setProducer('Faz Minha Musica');
  document.setSubject('Letra personalizada');
  document.setCreationDate(new Date());

  const fonts = {
    sans: await document.embedFont(StandardFonts.Helvetica),
    sansBold: await document.embedFont(StandardFonts.HelveticaBold),
    serif: await document.embedFont(StandardFonts.TimesRoman),
    serifItalic: await document.embedFont(StandardFonts.TimesRomanItalic),
  };

  let logo: PDFImage | undefined;
  if (input.logoBytes?.length) {
    try {
      logo = await document.embedPng(input.logoBytes);
    } catch {
      logo = undefined;
    }
  }

  let pageNumber = 0;
  const addPage = (): PDFPage => {
    pageNumber += 1;
    const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageFrame(page, pageNumber, fonts, logo);
    return page;
  };

  let page = addPage();
  page.drawText('Letra da Sua Musica', {
    x: MARGIN_X,
    y: 682,
    font: fonts.serif,
    size: 28,
    color: COLORS.terracotta,
  });
  page.drawText('P E R S O N A L I Z A D A   E S P E C I A L M E N T E   P A R A   V O C E', {
    x: MARGIN_X,
    y: 656,
    font: fonts.sansBold,
    size: 6.3,
    color: COLORS.gold,
  });

  let y = 620;
  const dedication = pdfSafeText(input.dedication ?? '').trim();
  if (dedication) {
    const label = `Uma cancao para ${dedication}`;
    page.drawText(label, {
      x: MARGIN_X,
      y,
      font: fonts.serifItalic,
      size: 13,
      color: COLORS.brown,
    });
    y -= 29;
  }

  const customerName = pdfSafeText(input.customerName ?? '').trim();
  if (customerName) {
    page.drawText(`Criada com carinho para ${customerName}`, {
      x: MARGIN_X,
      y,
      font: fonts.sans,
      size: 9,
      color: COLORS.muted,
    });
    y -= 34;
  }

  page.drawRectangle({
    x: MARGIN_X,
    y: y - 3,
    width: 42,
    height: 3,
    color: COLORS.terracotta,
  });
  y -= 28;

  const bodyWidth = PAGE_WIDTH - MARGIN_X * 2;
  const sourceLines = pdfSafeText(input.lyrics)
    .replace(/\r\n?/g, '\n')
    .split('\n');

  for (const sourceLine of sourceLines) {
    const trimmed = sourceLine.trim();
    const isSection =
      /^\[[^\]]+\]$/.test(trimmed) ||
      /^(verso|refr[aã]o|ponte|intro|final|outro)\b/i.test(trimmed);
    const font = isSection ? fonts.sansBold : fonts.serif;
    const fontSize = isSection ? 10 : 12;
    const lineHeight = isSection ? 20 : 18;
    const lines = trimmed
      ? wrapText(trimmed, font, fontSize, bodyWidth)
      : [''];

    for (const line of lines) {
      if (y < BODY_BOTTOM + lineHeight) {
        page = addPage();
        y = BODY_TOP;
      }
      if (line) {
        page.drawText(line, {
          x: MARGIN_X,
          y,
          font,
          size: fontSize,
          color: isSection ? COLORS.terracotta : COLORS.brown,
        });
      }
      y -= line ? lineHeight : 11;
    }
    if (isSection) y -= 2;
  }

  if (y < 105) {
    page = addPage();
    y = BODY_TOP;
  }
  y -= 20;
  page.drawText('Sua historia. Sua musica. Para sempre.', {
    x: MARGIN_X,
    y,
    font: fonts.serifItalic,
    size: 11,
    color: COLORS.terracotta,
  });

  return document.save();
}
