import { Router } from 'express';
import type { PeopleAnswer, PersonAnswer } from '../../../shared/contract/answers';
import { personPatchSchema } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { toPerson } from '../../services/answers';
import { listPeople, updatePerson } from '../../services/people/people';
import { requireId } from '../params';

export const peopleRouter = Router();

peopleRouter.get('/', (request, response) => {
  response.json({ people: listPeople(request.db, request.householdId).map(toPerson) } satisfies PeopleAnswer);
});

peopleRouter.patch('/:id', (request, response) => {
  const parsed = personPatchSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Person payload failed validation', parsed.error.issues);
  }

  const person = updatePerson(
    request.db,
    request.householdId,
    requireId(request.params.id),
    parsed.data,
  );
  response.json({ person: toPerson(person) } satisfies PersonAnswer);
});
