import { Router } from 'express';
import type { CategoriesAnswer, CategoryAnswer, CategoryChangeAnswer } from '../../../shared/contract/answers';
import { categoryOrderSchema, categoryPatchSchema, newCategorySchema } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { archiveCategory, listCategories } from '../../db/categories';
import { toCategory } from '../../services/answers';
import { addCategory } from '../../services/categories/addCategory';
import { changeCategory } from '../../services/categories/changeCategory';
import { reorderCategories } from '../../services/categories/reorderCategories';
import { requireId } from '../params';

export const categoriesRouter = Router();

categoriesRouter.get('/', (request, response) => {
  const includeArchived = request.query.includeArchived === 'true';
  response.json({
    categories: listCategories(request.db, request.householdId, { includeArchived }).map(toCategory),
  } satisfies CategoriesAnswer);
});

categoriesRouter.post('/', (request, response) => {
  const parsed = newCategorySchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Category payload failed validation', parsed.error.issues);
  }

  const { category, linesChanged } = addCategory(request.db, request.householdId, parsed.data);
  response.status(201).json({ category: toCategory(category), linesChanged } satisfies CategoryChangeAnswer);
});

categoriesRouter.put('/order', (request, response) => {
  const parsed = categoryOrderSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Category order payload failed validation', parsed.error.issues);
  }

  const reordered = reorderCategories(request.db, request.householdId, parsed.data.ids);
  response.json({ categories: reordered.map(toCategory) } satisfies CategoriesAnswer);
});

categoriesRouter.patch('/:id', (request, response) => {
  const parsed = categoryPatchSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Category payload failed validation', parsed.error.issues);
  }

  const { category, linesChanged } = changeCategory(request.db, request.householdId, requireId(request.params.id), parsed.data);
  response.json({ category: toCategory(category), linesChanged } satisfies CategoryChangeAnswer);
});

categoriesRouter.delete('/:id', (request, response) => {
  const category = archiveCategory(request.db, request.householdId, requireId(request.params.id));
  response.json({ category: toCategory(category) } satisfies CategoryAnswer);
});
