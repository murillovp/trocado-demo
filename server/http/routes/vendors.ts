import { Router } from 'express';
import type { AcceptVendorsAnswer, VendorAnswer, VendorEditAnswer, VendorsAnswer } from '../../../shared/contract/answers';
import { acceptVendorsSchema, vendorEditSchema } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { listVendorSummaries } from '../../db/vendors';
import { toVendorSummary } from '../../services/answers';
import { acceptVendor, acceptVendors } from '../../services/vendors/acceptVendor';
import { editVendor } from '../../services/vendors/editVendor';
import { requireId } from '../params';

export const vendorsRouter = Router();

vendorsRouter.get('/', (request, response) => {
  response.json({ vendors: listVendorSummaries(request.db, request.householdId).map(toVendorSummary) } satisfies VendorsAnswer);
});

vendorsRouter.patch('/:id', (request, response) => {
  const parsed = vendorEditSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Vendor payload failed validation', parsed.error.issues);
  }
  const { vendor, linesUpdated, linesSkipped } = editVendor(request.db, request.householdId, requireId(request.params.id), parsed.data);
  response.json({ vendor: toVendorSummary(vendor), linesUpdated, linesSkipped } satisfies VendorEditAnswer);
});

vendorsRouter.post('/accept', (request, response) => {
  const parsed = acceptVendorsSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Vendor payload failed validation', parsed.error.issues);
  }
  response.json(acceptVendors(request.db, request.householdId, parsed.data.vendorIds) satisfies AcceptVendorsAnswer);
});

vendorsRouter.post('/:id/accept', (request, response) => {
  const vendor = acceptVendor(request.db, request.householdId, requireId(request.params.id));
  response.json({ vendor: toVendorSummary(vendor) } satisfies VendorAnswer);
});
