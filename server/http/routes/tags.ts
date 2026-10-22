import { Router } from 'express';
import type { TagAnswer, TagDeletedAnswer, TagsAnswer } from '../../../shared/contract/answers';
import { newTagSchema, tagRenameSchema } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { createTag, deleteTag, listTags, renameTag } from '../../services/tags/tags';
import { requireId } from '../params';

export const tagsRouter = Router();

tagsRouter.get('/', (request, response) => {
  response.json({ tags: listTags(request.db, request.householdId) } satisfies TagsAnswer);
});

tagsRouter.post('/', (request, response) => {
  const parsed = newTagSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Tag payload failed validation', parsed.error.issues);
  }
  const tag = createTag(request.db, request.householdId, parsed.data.name);
  response.status(201).json({ tag } satisfies TagAnswer);
});

tagsRouter.patch('/:id', (request, response) => {
  const parsed = tagRenameSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Tag payload failed validation', parsed.error.issues);
  }
  const tag = renameTag(request.db, request.householdId, requireId(request.params.id), parsed.data.name);
  response.json({ tag } satisfies TagAnswer);
});

tagsRouter.delete('/:id', (request, response) => {
  const result = deleteTag(request.db, request.householdId, requireId(request.params.id));
  response.json(result satisfies TagDeletedAnswer);
});
