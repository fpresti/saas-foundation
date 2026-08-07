/** Client-side avatar resize/compress before Storage upload. */

export const AVATAR_MAX_BYTES = 1_048_576;
/** Reject absurd originals before decoding (browser memory). */
export const AVATAR_MAX_SOURCE_BYTES = 15 * 1_048_576;
export const AVATAR_MAX_EDGE = 512;
export const AVATAR_OUTPUT_MIME = 'image/webp' as const;

const ALLOWED_SOURCE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const QUALITY_STEPS = [0.86, 0.76, 0.66, 0.56, 0.46, 0.36, 0.28];

export function isAllowedAvatarSourceMime(mime: string): boolean {
  return ALLOWED_SOURCE_MIME.has(mime);
}

/** Fit inside a square box without upscaling. */
export function scaleToMaxEdge(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: 1, height: 1 };
  }
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Resize and compress an image so the upload stays under {@link AVATAR_MAX_BYTES}.
 * Output is WebP (falls back to JPEG if the browser cannot encode WebP).
 */
export async function prepareAvatarImage(file: File): Promise<File> {
  if (!isAllowedAvatarSourceMime(file.type)) {
    throw { code: 'invalid_mime', message: 'Use JPEG, PNG or WebP.' };
  }
  if (file.size > AVATAR_MAX_SOURCE_BYTES) {
    throw {
      code: 'file_too_large',
      message: 'Image is too large to process. Choose a smaller file.',
    };
  }

  const bitmap = await createImageBitmap(file);
  try {
    const size = scaleToMaxEdge(bitmap.width, bitmap.height, AVATAR_MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw { code: 'canvas_unavailable', message: 'Could not process the image.' };
    }
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);

    const encoded = await encodeUnderLimit(canvas, AVATAR_MAX_BYTES);
    if (!encoded) {
      throw {
        code: 'compress_failed',
        message: 'Could not compress the image under 1 MB.',
      };
    }

    const ext = encoded.type === 'image/jpeg' ? 'jpg' : 'webp';
    return new File([encoded], `avatar.${ext}`, {
      type: encoded.type,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

async function encodeUnderLimit(
  canvas: HTMLCanvasElement,
  maxBytes: number
): Promise<Blob | null> {
  const mimeCandidates = await preferredOutputMimes();
  let best: Blob | null = null;

  for (const mime of mimeCandidates) {
    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, mime, quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) {
        best = blob;
      }
      if (blob.size <= maxBytes) {
        return blob;
      }
    }
  }

  return best && best.size <= maxBytes ? best : null;
}

async function preferredOutputMimes(): Promise<string[]> {
  if (await canEncodeMime(AVATAR_OUTPUT_MIME)) {
    return [AVATAR_OUTPUT_MIME, 'image/jpeg'];
  }
  return ['image/jpeg'];
}

async function canEncodeMime(mime: string): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const blob = await canvasToBlob(canvas, mime, 0.8);
  return !!blob && blob.type === mime;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}
