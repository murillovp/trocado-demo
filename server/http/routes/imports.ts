import { Router } from 'express';
import type { ImportsAnswer } from '../../../shared/contract/answers';
import type { FileDetection, ImportReview, ReclassifyResult } from '../../../shared/contract/imports';
import {
  confirmRequestSchema,
  detectRequestSchema,
  importUploadSchema,
  screenshotUploadSchema,
} from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { getImportImage } from '../../db/imports';
import { getSettings } from '../../services/settings/settings';
import { mimeTypeOf } from '../../parsers/swileScreenshots';
import { detectFileAccounts } from '../../services/import/detect';
import { listImportHistory } from '../../services/import/history';
import { importFile, importScreenshots } from '../../services/import/importFile';
import {
  cancelImport,
  confirmImport,
  getImportReview,
  reclassifyUncategorized,
} from '../../services/import/review';
import { answerImport } from '../importStream';
import { requireId } from '../params';

export const importsRouter = Router();

importsRouter.get('/', (request, response) => {
  response.json({ imports: listImportHistory(request.db, request.householdId) } satisfies ImportsAnswer);
});

importsRouter.post('/', async (request, response) => {
  const parsed = importUploadSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Upload payload failed validation', parsed.error.issues);
  }
  const bytes = new Uint8Array(Buffer.from(parsed.data.fileBase64, 'base64'));
  if (bytes.length === 0) {
    throw new AppError('invalid_request', 'Uploaded file is empty');
  }

  const classifier = request.classifierFor(getSettings(request.db, request.householdId));
  await answerImport(request, response, (onStep) =>
    importFile(
      { db: request.db, classifier, onStep },
      {
        householdId: request.householdId,
        accountId: parsed.data.accountId,
        fileName: parsed.data.fileName,
        bytes,
      },
    ),
  );
});

importsRouter.post('/screenshots', async (request, response) => {
  const parsed = screenshotUploadSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Screenshot payload failed validation', parsed.error.issues);
  }

  const images = parsed.data.images.map((image) => {
    const bytes = new Uint8Array(Buffer.from(image.fileBase64, 'base64'));
    // The mime type always comes from the bytes, never from what the client sends.
    return { fileName: image.fileName, mimeType: mimeTypeOf(bytes) ?? '', bytes };
  });

  const settings = getSettings(request.db, request.householdId);
  await answerImport(request, response, (onStep) =>
    importScreenshots(
      {
        db: request.db,
        classifier: request.classifierFor(settings),
        reader: request.screenshotReaderFor(settings),
        onStep,
      },
      { householdId: request.householdId, accountId: parsed.data.accountId, images },
    ),
  );
});

importsRouter.get('/:id/images/:position', (request, response) => {
  const importId = requireId(request.params.id);
  const position = Number(request.params.position);
  if (!Number.isInteger(position) || position < 0) {
    throw new AppError('import_image_not_found', `Invalid image position ${request.params.position}`);
  }

  const image = getImportImage(request.db, request.householdId, importId, position);
  response.type(image.mimeType).send(image.bytes);
});

importsRouter.post('/reclassify', async (request, response) => {
  const classifier = request.classifierFor(getSettings(request.db, request.householdId));
  response.json((await reclassifyUncategorized({ db: request.db, classifier }, request.householdId)) satisfies ReclassifyResult);
});

importsRouter.post('/detect', async (request, response) => {
  const parsed = detectRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Detect payload failed validation', parsed.error.issues);
  }
  const bytes = new Uint8Array(Buffer.from(parsed.data.fileBase64, 'base64'));
  if (bytes.length === 0) {
    throw new AppError('invalid_request', 'Uploaded file is empty');
  }
  response.json((await detectFileAccounts(request.db, request.householdId, bytes)) satisfies FileDetection);
});

importsRouter.get('/:id', (request, response) => {
  response.json(getImportReview(request.db, request.householdId, requireId(request.params.id)) satisfies ImportReview);
});

importsRouter.post('/:id/confirm', async (request, response) => {
  const parsed = confirmRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Confirm payload failed validation', parsed.error.issues);
  }
  const review = await confirmImport(request.db, request.householdId, requireId(request.params.id), parsed.data.edits);
  response.json(review satisfies ImportReview);
});

importsRouter.delete('/:id', async (request, response) => {
  await cancelImport(request.db, request.householdId, requireId(request.params.id));
  response.status(204).end();
});
