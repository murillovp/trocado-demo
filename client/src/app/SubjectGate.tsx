import type { ReactNode } from 'react';
import type { Person } from '@/api/types';
import { QueryView } from '@/components/QueryView';
import { LoadingState } from '@/components/States';
import { SubjectContext, useSubject, type Subject } from './view';

/**
 * The three lines every data screen starts with: resolve the subject, show
 * loading or error, then hand the resolved subject and people to the screen.
 * This way no query fires for Casa before the remembered person is known.
 * Links below it carry the resolved subject in the address (`useTransacoesLink`).
 */
export function SubjectGate({
  allowHousehold,
  children,
}: {
  allowHousehold: boolean;
  children: (subject: Subject, people: Person[]) => ReactNode;
}) {
  const { peopleQuery, people, subject } = useSubject({ allowHousehold });
  return (
    <QueryView query={peopleQuery} className="contents">
      {() =>
        subject ? (
          <SubjectContext.Provider value={subject}>{children(subject, people)}</SubjectContext.Provider>
        ) : (
          <LoadingState />
        )
      }
    </QueryView>
  );
}
