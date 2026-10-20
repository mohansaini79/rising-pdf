import { PDFDocument, rgb, degrees, StandardFonts, PageSizes } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { ImageItem, PdfConversionSettings, AnnotationItem, WatermarkSettings, PageSize } from '../types';

// Set local Vite-bundled worker URL for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Helper: Convert any image (including WebP, SVG, BMP) to JPEG or PNG data URL via canvas
export async function normalizeImageToDataUrl(
  dataUrlOrFile: string | File,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.92
): Promise<{ dataUrl: string; width: number; height: number; isPng: boolean }> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let isFile = false;

    if (typeof dataUrlOrFile === 'string') {
      srcUrl = dataUrlOrFile;
    } else {
      srcUrl = URL.createObjectURL(dataUrlOrFile);
      isFile = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (isFile) URL.revokeObjectURL(srcUrl);
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      // If JPEG, fill white background to prevent black background on transparent PNGs
      const isPngTarget = format === 'image/png';
      if (!isPngTarget) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      const outDataUrl = canvas.toDataURL(format, quality);
      if (isFile) URL.revokeObjectURL(srcUrl);

      resolve({
        dataUrl: outDataUrl,
        width: canvas.width,
        height: canvas.height,
        isPng: isPngTarget,
      });
    };
    img.onerror = (err) => {
      if (isFile) URL.revokeObjectURL(srcUrl);
      reject(err);
    };
    img.src = srcUrl;
  });
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

export const PdfEngine = {
  /**
   * Convert list of images to high-grade PDF document
   */
  async convertImagesToPdf(
    images: ImageItem[],
    settings: PdfConversionSettings
  ): Promise<{ pdfBytes: Uint8Array; blobUrl: string; pageCount: number; sizeBytes: number }> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Standard dimensions in points (72 points = 1 inch)
    const standardDimensions: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
      a4: PageSizes.A4,
      letter: PageSizes.Letter,
      legal: PageSizes.Legal,
      a3: PageSizes.A3,
      a5: PageSizes.A5,
    };

    const marginPt = (settings.margin / 25.4) * 72; // Convert mm to pt

    for (let i = 0; i < images.length; i++) {
      const imgItem = images[i];

      // Prepare image buffer
      let isPng = imgItem.type === 'image/png';
      let dataUrl = imgItem.dataUrl;

      // Ensure proper format for embedding
      if (!dataUrl.startsWith('data:image/jpeg') && !dataUrl.startsWith('data:image/png')) {
        const normalized = await normalizeImageToDataUrl(dataUrl, 'image/jpeg', settings.imageQuality);
        dataUrl = normalized.dataUrl;
        isPng = false;
      }

      // Convert Base64 dataUrl to Uint8Array
      const base64Data = dataUrl.split(',')[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let j = 0; j < binaryStr.length; j++) {
        bytes[j] = binaryStr.charCodeAt(j);
      }

      let embeddedImage;
      try {
        if (isPng) {
          embeddedImage = await pdfDoc.embedPng(bytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(bytes);
        }
      } catch {
        // Fallback: Re-normalize to JPEG if PNG embed fails
        const fallback = await normalizeImageToDataUrl(dataUrl, 'image/jpeg', settings.imageQuality);
        const fbBase64 = fallback.dataUrl.split(',')[1];
        const fbBin = atob(fbBase64);
        const fbBytes = new Uint8Array(fbBin.length);
        for (let j = 0; j < fbBin.length; j++) {
          fbBytes[j] = fbBin.charCodeAt(j);
        }
        embeddedImage = await pdfDoc.embedJpg(fbBytes);
      }

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      // Determine page dimensions
      let pageWidth: number;
      let pageHeight: number;

      if (settings.pageSize === 'fit') {
        pageWidth = imgWidth + marginPt * 2;
        pageHeight = imgHeight + marginPt * 2;
      } else {
        const dims = standardDimensions[settings.pageSize] || PageSizes.A4;
        let [w, h] = dims;

        if (settings.orientation === 'landscape') {
          pageWidth = Math.max(w, h);
          pageHeight = Math.min(w, h);
        } else if (settings.orientation === 'portrait') {
          pageWidth = Math.min(w, h);
          pageHeight = Math.max(w, h);
        } else {
          // Auto orientation: match image aspect ratio
          if (imgWidth > imgHeight) {
            pageWidth = Math.max(w, h);
            pageHeight = Math.min(w, h);
          } else {
            pageWidth = Math.min(w, h);
            pageHeight = Math.max(w, h);
          }
        }
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Apply background color if not default white
      if (settings.backgroundColor && settings.backgroundColor !== '#FFFFFF') {
        const bgRgb = hexToRgb01(settings.backgroundColor);
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
        });
      }

      // Calculate available printable area
      const availableWidth = Math.max(10, pageWidth - marginPt * 2);
      const availableHeight = Math.max(10, pageHeight - marginPt * 2 - (settings.headerTitle ? 24 : 0) - (settings.footerText || settings.addPageNumbers ? 24 : 0));

      let drawWidth = availableWidth;
      let drawHeight = availableHeight;
      let drawX = marginPt;
      let drawY = marginPt + (settings.footerText || settings.addPageNumbers ? 24 : 0);

      if (settings.fitMode === 'contain') {
        const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
        drawWidth = imgWidth * scale;
        drawHeight = imgHeight * scale;
        drawX = marginPt + (availableWidth - drawWidth) / 2;
        drawY = marginPt + (settings.footerText || settings.addPageNumbers ? 24 : 0) + (availableHeight - drawHeight) / 2;
      } else if (settings.fitMode === 'stretch') {
        drawWidth = availableWidth;
        drawHeight = availableHeight;
      }

      // Draw the image
      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });

      // Header title
      if (settings.headerTitle) {
        page.drawText(settings.headerTitle, {
          x: marginPt,
          y: pageHeight - marginPt - 14,
          size: 9,
          font: fontBold,
          color: rgb(0.4, 0.45, 0.5),
        });
      }

      // Footer text or page numbers
      if (settings.footerText) {
        page.drawText(settings.footerText, {
          x: marginPt,
          y: marginPt + 6,
          size: 8,
          font,
          color: rgb(0.45, 0.48, 0.52),
        });
      }

      if (settings.addPageNumbers) {
        const pageNumText = `${i + 1} / ${images.length}`;
        const textWidth = font.widthOfTextAtSize(pageNumText, 8);
        const pageNumX = settings.pageNumberPosition === 'bottom-center'
          ? (pageWidth - textWidth) / 2
          : pageWidth - marginPt - textWidth;

        page.drawText(pageNumText, {
          x: pageNumX,
          y: marginPt + 6,
          size: 8,
          font,
          color: rgb(0.45, 0.48, 0.52),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    return {
      pdfBytes,
      blobUrl,
      pageCount: images.length,
      sizeBytes: pdfBytes.byteLength,
    };
  },

  /**
   * Load and render a specific page of a PDF onto an HTML canvas using pdfjs-dist
   */
  async renderPageToCanvas(
    pdfData: Uint8Array | string,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale = 1.0
  ): Promise<{ width: number; height: number; pageCount: number }> {
    let loadingTask;
    if (typeof pdfData === 'string') {
      if (pdfData.startsWith('data:')) {
        const base64 = pdfData.split(',')[1];
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        loadingTask = pdfjsLib.getDocument({ data: bytes });
      } else {
        loadingTask = pdfjsLib.getDocument({ url: pdfData });
      }
    } else {
      loadingTask = pdfjsLib.getDocument({ data: pdfData });
    }

    const pdf = await loadingTask.promise;
    const pageIndex = Math.min(Math.max(1, pageNumber), pdf.numPages);
    const page = await pdf.getPage(pageIndex);

    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    // @ts-expect-error pdfjs-dist typing compatibility
    await page.render(renderContext).promise;

    return {
      width: viewport.width,
      height: viewport.height,
      pageCount: pdf.numPages,
    };
  },

  /**
   * Get PDF page count and page sizes
   */
  async getPdfInfo(pdfBytes: Uint8Array | string): Promise<{ pageCount: number; pages: { width: number; height: number }[] }> {
    let bytes: Uint8Array;
    if (typeof pdfBytes === 'string') {
      const base64 = pdfBytes.includes(',') ? pdfBytes.split(',')[1] : pdfBytes;
      const bin = atob(base64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = pdfBytes;
    }

    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages().map((p) => {
      const size = p.getSize();
      return { width: size.width, height: size.height };
    });

    return {
      pageCount: pages.length,
      pages,
    };
  },

  /**
   * Apply annotations, signatures, watermarks, stamps, and page edits to a PDF
   */
  async applyEditsToPdf(
    inputBytes: Uint8Array,
    options: {
      annotations?: AnnotationItem[];
      watermark?: WatermarkSettings;
      pageRotations?: Record<number, number>; // pageIndex (0-based) -> additional rotation in degrees
      pageOrder?: number[]; // list of original page indices to keep/reorder
    }
  ): Promise<{ pdfBytes: Uint8Array; blobUrl: string; pageCount: number; sizeBytes: number }> {
    const srcDoc = await PDFDocument.load(inputBytes);
    let targetDoc: PDFDocument;

    // Handle page reordering or deletion if pageOrder is provided
    if (options.pageOrder && options.pageOrder.length > 0) {
      targetDoc = await PDFDocument.create();
      const copiedPages = await targetDoc.copyPages(srcDoc, options.pageOrder);
      copiedPages.forEach((p) => targetDoc.addPage(p));
    } else {
      targetDoc = srcDoc;
    }

    const pages = targetDoc.getPages();
    const font = await targetDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await targetDoc.embedFont(StandardFonts.HelveticaBold);

    // Apply rotations
    if (options.pageRotations) {
      for (let i = 0; i < pages.length; i++) {
        const addedRot = options.pageRotations[i];
        if (addedRot) {
          const currentRot = pages[i].getRotation().angle;
          pages[i].setRotation(degrees((currentRot + addedRot) % 360));
        }
      }
    }

    // Apply Watermark
    if (options.watermark && options.watermark.enabled && options.watermark.text.trim()) {
      const wm = options.watermark;
      const wmRgb = hexToRgb01(wm.color || '#94A3B8');
      const targetIndices = wm.applyToAllPages ? pages.map((_, i) => i) : [0];

      for (const idx of targetIndices) {
        if (pages[idx]) {
          const p = pages[idx];
          const { width, height } = p.getSize();
          const textSize = wm.fontSize || 42;
          const text = wm.text;
          const textWidth = fontBold.widthOfTextAtSize(text, textSize);

          p.drawText(text, {
            x: width / 2 - textWidth / 2,
            y: height / 2,
            size: textSize,
            font: fontBold,
            color: rgb(wmRgb.r, wmRgb.g, wmRgb.b),
            opacity: wm.opacity || 0.18,
            rotate: degrees(wm.rotation || -45),
          });
        }
      }
    }

    // Apply Annotations
    if (options.annotations && options.annotations.length > 0) {
      for (const ann of options.annotations) {
        const page = pages[ann.pageIndex];
        if (!page) continue;

        const { width: pWidth, height: pHeight } = page.getSize();
        const ptX = (ann.x / 100) * pWidth;
        const ptY = pHeight - ((ann.y / 100) * pHeight) - ((ann.height / 100) * pHeight);
        const ptWidth = (ann.width / 100) * pWidth;
        const ptHeight = (ann.height / 100) * pHeight;

        if (ann.type === 'text' && ann.text) {
          const textRgb = hexToRgb01(ann.color || '#000000');
          const fontSize = ann.fontSize || 12;

          if (ann.backgroundColor && ann.backgroundColor !== 'transparent') {
            const bgRgb = hexToRgb01(ann.backgroundColor);
            page.drawRectangle({
              x: ptX - 2,
              y: ptY - 2,
              width: ptWidth + 4,
              height: ptHeight + 4,
              color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
              opacity: ann.opacity ?? 1,
            });
          }

          page.drawText(ann.text, {
            x: ptX,
            y: ptY + 4,
            size: fontSize,
            font: fontBold,
            color: rgb(textRgb.r, textRgb.g, textRgb.b),
            opacity: ann.opacity ?? 1,
          });
        } else if (ann.type === 'highlight') {
          const hlRgb = hexToRgb01(ann.color || '#FACC15');
          page.drawRectangle({
            x: ptX,
            y: ptY,
            width: ptWidth,
            height: ptHeight,
            color: rgb(hlRgb.r, hlRgb.g, hlRgb.b),
            opacity: ann.opacity || 0.35,
          });
        } else if (ann.type === 'redact') {
          // Blackout redaction block
          page.drawRectangle({
            x: ptX,
            y: ptY,
            width: ptWidth,
            height: ptHeight,
            color: rgb(0.04, 0.06, 0.1),
            opacity: 1.0,
          });
        } else if ((ann.type === 'signature' || ann.type === 'stamp') && ann.imageDataUrl) {
          try {
            const norm = await normalizeImageToDataUrl(ann.imageDataUrl, 'image/png');
            const b64 = norm.dataUrl.split(',')[1];
            const bin = atob(b64);
            const bArr = new Uint8Array(bin.length);
            for (let k = 0; k < bin.length; k++) bArr[k] = bin.charCodeAt(k);

            const embeddedImg = await targetDoc.embedPng(bArr);
            page.drawImage(embeddedImg, {
              x: ptX,
              y: ptY,
              width: ptWidth,
              height: ptHeight,
              opacity: ann.opacity ?? 1,
            });
          } catch (e) {
            console.error('Failed to embed signature/stamp image:', e);
          }
        }
      }
    }

    const pdfBytes = await targetDoc.save();
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    return {
      pdfBytes,
      blobUrl,
      pageCount: pages.length,
      sizeBytes: pdfBytes.byteLength,
    };
  },

  /**
   * Merge multiple PDF byte arrays into one single document
   */
  async mergePdfs(pdfBuffers: Uint8Array[]): Promise<{ pdfBytes: Uint8Array; blobUrl: string; pageCount: number; sizeBytes: number }> {
    const mergedDoc = await PDFDocument.create();

    for (const buf of pdfBuffers) {
      const doc = await PDFDocument.load(buf);
      const copied = await mergedDoc.copyPages(doc, doc.getPageIndices());
      copied.forEach((p) => mergedDoc.addPage(p));
    }

    const pdfBytes = await mergedDoc.save();
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    return {
      pdfBytes,
      blobUrl,
      pageCount: mergedDoc.getPageCount(),
      sizeBytes: pdfBytes.byteLength,
    };
  },

  /**
   * Extract thumbnail from the first page of a PDF data
   */
  async generateThumbnail(pdfData: Uint8Array | string): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      await this.renderPageToCanvas(pdfData, 1, canvas, 0.35);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch {
      // Fallback clean placeholder thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 220;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, 160, 220);
        ctx.fillStyle = '#D97706';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PDF STUDIO', 80, 110);
      }
      return canvas.toDataURL('image/jpeg', 0.8);
    }
  },
};
