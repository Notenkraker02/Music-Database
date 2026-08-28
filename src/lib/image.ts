// Client-side cover compression.
//
// Goal: keep the covers bucket small enough for a large collection. With the
// defaults below (longest side 700px, WebP, ~85 KB cap) 10,000 covers fit in
// well under 1 GB — most covers land around 40–70 KB.
//
// The old approach re-encoded to JPEG at a fixed quality and, on the edit page,
// wasn't applied at all — so phone photos were stored near their original size.
// This version always runs, respects EXIF orientation, prefers WebP, and keeps
// lowering quality until the result is under the target byte budget.

export interface CompressResult {
  file: File;
  contentType: string;
  ext: "webp" | "jpeg";
}

export interface CompressOptions {
  /** Longest side in pixels. */
  maxDim?: number;
  /** Try to keep the encoded file under this many bytes. */
  targetBytes?: number;
  /** Don't drop JPEG/WebP quality below this. */
  minQuality?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDim: 700,
  targetBytes: 85_000,
  minQuality: 0.4,
};

let _webpSupported: boolean | null = null;
function supportsWebp(): boolean {
  if (_webpSupported !== null) return _webpSupported;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    _webpSupported = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    _webpSupported = false;
  }
  return _webpSupported;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

interface LoadedImage {
  w: number;
  h: number;
  src: CanvasImageSource;
  close: () => void;
}

async function loadImage(file: File): Promise<LoadedImage> {
  // Preferred: createImageBitmap — fast, memory-friendly, respects orientation.
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      return { w: bmp.width, h: bmp.height, src: bmp, close: () => bmp.close() };
    } catch {
      // Fall through to the <img> path (e.g. formats createImageBitmap rejects).
    }
  }

  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image. Try a JPEG or PNG."));
    };
    im.src = url;
  });
  return {
    w: img.naturalWidth,
    h: img.naturalHeight,
    src: img,
    close: () => URL.revokeObjectURL(url),
  };
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<CompressResult> {
  const { maxDim, targetBytes, minQuality } = { ...DEFAULTS, ...opts };
  const { w, h, src, close } = await loadImage(file);

  try {
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(src, 0, 0, tw, th);

    const webp = supportsWebp();
    const type = webp ? "image/webp" : "image/jpeg";

    // Step quality down until we're under the target (or hit the floor).
    let quality = 0.82;
    let blob = await canvasToBlob(canvas, type, quality);
    while (blob && blob.size > targetBytes && quality > minQuality) {
      quality = Math.round((quality - 0.1) * 100) / 100;
      blob = await canvasToBlob(canvas, type, quality);
    }

    // Still too big at min quality? Shrink dimensions once more as a backstop.
    if (blob && blob.size > targetBytes && Math.max(tw, th) > 480) {
      const s2 = 480 / Math.max(tw, th);
      const c2 = document.createElement("canvas");
      c2.width = Math.max(1, Math.round(tw * s2));
      c2.height = Math.max(1, Math.round(th * s2));
      const cx2 = c2.getContext("2d");
      if (cx2) {
        cx2.drawImage(canvas, 0, 0, c2.width, c2.height);
        const shrunk = await canvasToBlob(c2, type, Math.max(minQuality, 0.5));
        if (shrunk) blob = shrunk;
      }
    }

    if (!blob) throw new Error("Image compression failed.");

    const ext: "webp" | "jpeg" = webp ? "webp" : "jpeg";
    return {
      file: new File([blob], `cover.${ext}`, { type }),
      contentType: type,
      ext,
    };
  } finally {
    close();
  }
}

/**
 * A collision-safe storage path for a cover. Two different records that share a
 * title (common with singles) would otherwise overwrite each other's cover.
 */
export function makeCoverPath(title: string, ext: string): string {
  const safe =
    (title || "cover").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "cover";
  const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `cover_${safe}_${token}.${ext}`;
}
