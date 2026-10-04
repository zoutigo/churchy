/** Images inline : redimensionnées et compressées dans le navigateur, puis stockées en base64 dans le texte. */
export const MAX_IMAGE_DIMENSION = 1280;
/** Taille maximale d'une image encodée (data URL), ≈ 400 ko d'image. */
export const MAX_IMAGE_DATA_URL_LENGTH = 540_000;
const KEEP_GIF_MAX_BYTES = 300_000;

export type ImageErrorCode = 'unreadable' | 'format' | 'canvas' | 'tooHeavy';

/** `code` sert à afficher le message dans la langue de l'interface ; `message` reste lisible dans les journaux. */
export class ImageError extends Error {
  constructor(
    readonly code: ImageErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function isSupportedImage(file: Pick<File, 'type'>): boolean {
  return /^image\/(png|jpe?g|webp|gif)$/i.test(file.type);
}

/** Dimensions réduites pour tenir dans `max` px (jamais agrandies), proportions conservées. */
export function fitSize(width: number, height: number, max = MAX_IMAGE_DIMENSION) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ImageError('unreadable', 'Image illisible'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageError('unreadable', 'Image illisible'));
    };
    img.src = url;
  });
}

/** Convertit un fichier image en data URL légère (JPEG ≤ 1280 px), ou lève une `ImageError` lisible. */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!isSupportedImage(file))
    throw new ImageError('format', 'Format non pris en charge (PNG, JPEG, WebP ou GIF)');
  // Un petit GIF est gardé tel quel pour ne pas perdre l'animation.
  if (/gif/i.test(file.type) && file.size <= KEEP_GIF_MAX_BYTES) return readAsDataUrl(file);

  const img = await loadImage(file);
  let { width, height } = fitSize(img.naturalWidth, img.naturalHeight);
  for (const quality of [0.82, 0.7, 0.55, 0.45]) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageError('canvas', 'Traitement d’image indisponible');
    ctx.fillStyle = '#fff'; // JPEG sans transparence
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= MAX_IMAGE_DATA_URL_LENGTH) return url;
    if (quality <= 0.55)
      ({ width, height } = fitSize(width, height, Math.round(Math.max(width, height) * 0.75)));
  }
  throw new ImageError('tooHeavy', 'Image trop lourde, même compressée');
}
