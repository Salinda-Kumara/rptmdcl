/**
 * Overlay a rubber-stamp-style "APPROVED"/"REJECTED" mark (with the decision
 * date and the verifying officer's name) onto a payment slip, for display
 * only — the original uploaded file in storage is never modified. Works for
 * both image and PDF payment slips.
 */
import { imageToPngBytes, renderPdfPagesToPngs } from './application-form-pdf';

export interface StampInfo {
  verdict: 'APPROVED' | 'REJECTED';
  date: string; // already formatted for display, e.g. "21 Jul 2026"
  by: string;   // verifying officer's name
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(',')[1];
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Draw the rotated rubber-stamp block (verdict + date + officer) centered on a canvas. */
function drawStamp(canvas: HTMLCanvasElement, info: StampInfo) {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const color = info.verdict === 'APPROVED' ? '#059669' : '#dc2626'; // emerald-600 / red-600
  const scale = Math.min(width, height) / 620; // stamp size relative to the image

  const boxW = 620 * scale;
  const boxH = 260 * scale;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-16 * Math.PI) / 180);
  ctx.globalAlpha = 0.88;

  // Border box.
  ctx.lineWidth = 9 * scale;
  ctx.strokeStyle = color;
  ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

  ctx.textAlign = 'center';
  ctx.fillStyle = color;

  // Big verdict text.
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${88 * scale}px Arial, sans-serif`;
  ctx.fillText(info.verdict, 0, -boxH / 2 + 92 * scale);

  // Divider line.
  ctx.beginPath();
  ctx.moveTo(-boxW / 2 + 30 * scale, -boxH / 2 + 148 * scale);
  ctx.lineTo(boxW / 2 - 30 * scale, -boxH / 2 + 148 * scale);
  ctx.lineWidth = 3 * scale;
  ctx.stroke();

  // Date + officer name, below the divider.
  ctx.font = `600 ${32 * scale}px Arial, sans-serif`;
  ctx.fillText(`Date: ${info.date}`, 0, -boxH / 2 + 192 * scale);
  ctx.font = `600 ${30 * scale}px Arial, sans-serif`;
  ctx.fillText(`By: ${info.by}`, 0, -boxH / 2 + 232 * scale);

  ctx.restore();
}

/** Stamp raw PNG bytes in place — used both here and when embedding a payment
 * slip page directly into the printed application packet. */
export async function stampPngBytes(pngBytes: Uint8Array, info: StampInfo): Promise<Uint8Array> {
  const blob = new Blob([pngBytes as unknown as BlobPart], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    drawStamp(canvas, info);
    return dataUrlToBytes(canvas.toDataURL('image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Returns a stamped copy of the payment slip as a Blob — a PDF for PDF
 * sources (every page stamped), or a PNG for image sources.
 */
export async function stampPaymentSlip(
  bytes: Uint8Array,
  mimeType: string,
  fileName: string,
  info: StampInfo,
): Promise<Blob> {
  const name = (fileName || '').toLowerCase();
  const isPdf = mimeType.includes('pdf') || name.endsWith('.pdf');

  if (isPdf) {
    const pages = await renderPdfPagesToPngs(bytes);
    const { PDFDocument } = await import('pdf-lib');
    const out = await PDFDocument.create();
    for (const p of pages) {
      const stamped = await stampPngBytes(p.png, info);
      const img = await out.embedPng(stamped);
      const page = out.addPage([p.widthPt, p.heightPt]);
      page.drawImage(img, { x: 0, y: 0, width: p.widthPt, height: p.heightPt });
    }
    const outBytes = await out.save();
    return new Blob([outBytes as unknown as BlobPart], { type: 'application/pdf' });
  }

  const png = await imageToPngBytes(bytes, mimeType);
  const stamped = await stampPngBytes(png, info);
  return new Blob([stamped as unknown as BlobPart], { type: 'image/png' });
}
