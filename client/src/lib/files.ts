/** Reads a file the way the upload API takes it: base64, with no "data:…;base64," prefix. */
export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

const MIXED_FILES_MESSAGE = 'Envie um extrato por vez, ou só capturas do Swile.';
const WRONG_IMAGE_FORMAT_MESSAGE = 'Envie as capturas em PNG ou JPEG.';
const TOO_MANY_SCREENSHOTS_MESSAGE = 'Escolha no máximo 20 capturas de uma vez.';
const OVERSIZED_MESSAGE = 'As capturas passam de 15 MB. Envie menos de cada vez.';

/** The server's limits on one screenshot import (`importFile.ts`), checked here so a refusal comes before the upload. */
export const MAX_SCREENSHOTS = 20;
export const MAX_SCREENSHOTS_BYTES = 15 * 1024 * 1024;

/** Only PNG or JPEG, by mime type or extension: the only formats the AI reader accepts. */
export function isImageFile(file: File): boolean {
  return file.type === 'image/png' || file.type === 'image/jpeg' || /\.(png|jpe?g)$/i.test(file.name);
}

/** Any image at all, including one in a format we do not accept (e.g. HEIC): decides whether a batch is a screenshot upload, as opposed to a mix with a bank file. */
export function looksLikeImage(file: File): boolean {
  return file.type.startsWith('image/') || isImageFile(file);
}

/**
 * Why this pick cannot be imported, as the PT-BR sentence to show, or null
 * when it can. One bank file, or only screenshots (up to 20 and 15 MB).
 */
export function pickProblem(files: File[]): string | null {
  if (files.length > 1 && !files.every(looksLikeImage)) return MIXED_FILES_MESSAGE;
  if (files.some(looksLikeImage) && !files.every(isImageFile)) return WRONG_IMAGE_FORMAT_MESSAGE;
  if (!files.every(isImageFile)) return null;
  if (files.length > MAX_SCREENSHOTS) return TOO_MANY_SCREENSHOTS_MESSAGE;
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_SCREENSHOTS_BYTES) return OVERSIZED_MESSAGE;
  return null;
}
