import type { NextFunction, Request, Response } from 'express';
import type { ScreenshotReader } from '../ai/screenshots';
import type { VendorClassifier } from '../ai/types';

export type ClassifierFactory = (settings: Record<string, string>) => VendorClassifier | null;
export type ScreenshotReaderFactory = (settings: Record<string, string>) => ScreenshotReader | null;

declare module 'express-serve-static-core' {
  interface Request {
    classifierFor: ClassifierFactory;
    screenshotReaderFor: ScreenshotReaderFactory;
  }
}

/**
 * Gives every route the function that builds the AI classifier from settings.
 * The app uses the real provider; tests pass a fake here.
 */
export function withClassifier(factory: ClassifierFactory) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    request.classifierFor = factory;
    next();
  };
}

/**
 * Gives every route the function that builds the Swile screenshot reader
 * from settings. The app uses the real provider; tests pass a fake here.
 */
export function withScreenshotReader(factory: ScreenshotReaderFactory) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    request.screenshotReaderFor = factory;
    next();
  };
}
