/** One row of the Swile statement as the model read it. */
export type ScreenshotRow = {
  /** "DL*UberRides", "ESTORNO", as shown. */
  description: string;
  /** ISO "2026-09-18", or null when not visible. */
  date: string | null;
  /** "18:56", or null when not visible. */
  time: string | null;
  /** Signed centavos: "- R$ 12,90" is -1290, "+ R$ 8,95" is 895. Null when not visible. */
  amountCents: number | null;
};

export interface ScreenshotReader {
  /** Every transaction row on one screenshot, top to bottom. Throws AppError('ai_unreadable') when the answer is not usable. */
  readSwileScreenshot(image: { bytes: Uint8Array; mimeType: string }): Promise<ScreenshotRow[]>;
}
