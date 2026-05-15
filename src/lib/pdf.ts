/* eslint-disable @typescript-eslint/no-explicit-any */
import { createCanvas } from "canvas";

export async function pdfSivuKuvaksi(
  buffer: Buffer<ArrayBuffer>,
  sivuNumero = 1
): Promise<{ buffer: Buffer<ArrayBuffer>; sivuja: number }> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = (pdfjsLib as any).getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const sivuja = pdfDoc.numPages;
  const sivu = await pdfDoc.getPage(sivuNumero);

  // 2x skaalaus ≈ 150 DPI
  const skaalaus = 2.0;
  const viewport = sivu.getViewport({ scale: skaalaus });

  const canvas = createCanvas(
    Math.round(viewport.width),
    Math.round(viewport.height)
  );
  const ctx = canvas.getContext("2d") as any;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await sivu.render({ canvasContext: ctx, viewport, canvas }).promise;

  const pngBuffer = canvas.toBuffer("image/png") as Buffer<ArrayBuffer>;
  return { buffer: pngBuffer, sivuja };
}
