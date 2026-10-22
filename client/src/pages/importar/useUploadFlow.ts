import { useQueryClient } from '@tanstack/react-query';
import { useReducer, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '@/api/client';
import { detectFile, uploadImport, uploadScreenshots } from '@/api/endpoints';
import { keys, useChange, useServerCall } from '@/api/queries';
import type { FileDetection, ImportFormat } from '@/api/types';
import { IMPORT_CANCELLED_MESSAGE, type UploadStep } from '@/api/upload';
import { useViewPath } from '@/app/view';
import { fileToBase64, pickProblem } from '@/lib/files';
import type { ReviewNavigationState } from './reviewState';

export type Picked = { file: File; base64: string };

type State = {
  picked: Picked[];
  detection: FileDetection | null;
  accountId: string;
  /** Why the last pick was refused, before anything was read. */
  pickError: string | null;
  /** A neutral message about how the last import ended, such as "cancelada". */
  notice: string | null;
  step: UploadStep | null;
};

type Action =
  | { type: 'reset'; pickError?: string; notice?: string }
  | { type: 'picked'; picked: Picked[] }
  | { type: 'detected'; detection: FileDetection }
  | { type: 'account'; accountId: string }
  | { type: 'step'; step: UploadStep | null };

const IDLE: State = { picked: [], detection: null, accountId: '', pickError: null, notice: null, step: null };

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return { ...IDLE, pickError: action.pickError ?? null, notice: action.notice ?? null };
    case 'picked':
      return { ...IDLE, picked: action.picked };
    case 'detected':
      return { ...state, detection: action.detection, accountId: action.detection.accountIds[0] ?? '' };
    case 'account':
      return { ...state, accountId: action.accountId };
    case 'step':
      return { ...state, step: action.step };
  }
}

type UploadInput = { accountId: string; files: Picked[]; format: ImportFormat; controller: AbortController };

function sendImport({ accountId, files, format, controller }: UploadInput, onStep: (step: UploadStep) => void) {
  const options = { signal: controller.signal };
  return format === 'swile_screenshots'
    ? uploadScreenshots(
        { accountId, images: files.map((item) => ({ fileName: item.file.name, fileBase64: item.base64 })) },
        onStep,
        options,
      )
    : uploadImport({ accountId, fileName: files[0]!.file.name, fileBase64: files[0]!.base64 }, onStep, options);
}

/**
 * Everything the upload card remembers: the file picked, what the server said
 * it is, the account chosen and how far the import has got. Choosing a file
 * asks the server what it is; an answer for a file no longer picked is
 * dropped. While a file is being checked or imported, `locked` is true and
 * the screen takes no new file.
 */
export function useUploadFlow() {
  const navigate = useNavigate();
  const viewPath = useViewPath();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(reduce, IDLE);
  // Counts the files picked, so a late answer can tell it is no longer the current one.
  const currentPick = useRef(0);
  const running = useRef<AbortController | null>(null);

  const detect = useServerCall(
    async ({ base64, pick }: { base64: string; pick: number }) => ({
      detection: await detectFile(base64),
      pick,
    }),
    {
      onSuccess: ({ detection, pick }) => {
        if (pick === currentPick.current) dispatch({ type: 'detected', detection });
      },
    },
  );
  const upload = useChange(
    (input: UploadInput) => {
      dispatch({ type: 'step', step: null });
      return sendImport(input, (step) => dispatch({ type: 'step', step })).catch((error: unknown) => {
        // The server may still finish a timed-out import, so look again at what it has.
        if (error instanceof ApiError && error.code === 'import_timeout') refreshHistory();
        throw error;
      });
    },
    {
      toastErrors: false,
      onSuccess: (result, input) => {
        if (input.controller.signal.aborted) return;
        // The review shows why the AI gave no suggestions, above its list, until the person leaves it.
        const { aiFailure } = result.import;
        const state: ReviewNavigationState | undefined = aiFailure ? { aiFailure } : undefined;
        navigate(viewPath(`/transacoes/importar/${result.import.importId}`), { state });
      },
    },
  );

  function refreshHistory() {
    void queryClient.invalidateQueries({ queryKey: keys.imports });
  }

  /** Back to the start, with an optional message. Also forgets any answer still on its way. */
  function reset(message: { pickError?: string; notice?: string } = {}) {
    currentPick.current += 1;
    dispatch({ type: 'reset', ...message });
    detect.reset();
    upload.reset();
  }

  async function choose(files: File[]) {
    if (files.length === 0) return;
    const problem = pickProblem(files);
    if (problem) {
      reset({ pickError: problem });
      return;
    }
    reset();
    const pick = currentPick.current;
    const loaded = await Promise.all(files.map(async (file) => ({ file, base64: await fileToBase64(file) })));
    if (pick !== currentPick.current) return;
    dispatch({ type: 'picked', picked: loaded });
    detect.mutate({ base64: loaded[0]!.base64, pick });
  }

  function submit() {
    if (!state.picked.length || !state.accountId || !state.detection) return;
    const controller = new AbortController();
    running.current = controller;
    upload.mutate({ accountId: state.accountId, files: state.picked, format: state.detection.format, controller });
  }

  /** Stops the upload in the browser. The server finishes or fails on its own. */
  function cancel() {
    running.current?.abort();
    reset({ notice: IMPORT_CANCELLED_MESSAGE });
    refreshHistory();
  }

  return {
    ...state,
    error: detect.error ?? upload.error,
    detecting: detect.isPending,
    importing: upload.isPending,
    locked: detect.isPending || upload.isPending,
    isSwile: state.detection?.format === 'swile_screenshots',
    choose,
    setAccountId: (accountId: string) => dispatch({ type: 'account', accountId }),
    submit,
    cancel,
  };
}
