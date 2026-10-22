import { useCallback, useEffect, useState } from 'react';

/** What an open editor needs to protect its unsaved changes: report them, and answer the ask. */
export type UnsavedGuard = {
  /** True while the editor should ask "Descartar as alterações?" instead of showing its buttons. */
  asking: boolean;
  /** The editor tells the page whether its draft differs from what is saved. */
  onDirtyChange: (dirty: boolean) => void;
  /** The editor tells the page whether a save is in flight. */
  onSavingChange: (saving: boolean) => void;
  /** "Fechar": closes at once, or starts the ask when there are unsaved changes. */
  onRequestClose: () => void;
  /** "Descartar": closes the editor, and opens the row that was asked for, if any. Always works. */
  onDiscard: () => void;
  /** "Continuar editando": drops the ask and leaves the editor as it is. */
  onKeepEditing: () => void;
};

/** Which row is open, and what was asked for while its editor was busy: a row to open, or null to just close. */
type OpenState = { openId: string | null; pending: { next: string | null } | null };

/**
 * Which row of a list has its editor open, for Transações and Fornecedores. The draft stays
 * inside the editor; the page only learns whether it is dirty or saving. Asking to open or close
 * a row while the open editor is dirty raises the ask, and the request waits for the answer.
 * While the editor is saving, the request waits for the save: when it succeeds the editor closes
 * and the asked-for row opens; when it fails the editor stays open with its draft and the ask applies.
 * `close` is for a finished save: it never asks, and it only closes the row it is given.
 */
export function useOpenRow() {
  const [{ openId, pending }, setOpen] = useState<OpenState>({ openId: null, pending: null });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function request(next: string | null) {
    if (openId !== null && (dirty || saving)) setOpen((current) => ({ ...current, pending: { next } }));
    else setOpen({ openId: next, pending: null });
  }

  // Stable, because editors call them from an effect. A clean editor has nothing to ask.
  const onDirtyChange = useCallback((next: boolean) => {
    setDirty(next);
    if (!next) setOpen((current) => (current.pending ? { ...current, pending: null } : current));
  }, []);
  const onSavingChange = useCallback((next: boolean) => setSaving(next), []);

  const guard: UnsavedGuard = {
    asking: pending !== null && dirty && !saving,
    onDirtyChange,
    onSavingChange,
    onRequestClose: () => request(null),
    onDiscard: () => setOpen({ openId: pending?.next ?? null, pending: null }),
    onKeepEditing: () => setOpen((current) => ({ ...current, pending: null })),
  };

  return {
    openId,
    /** The row's chevron: opens the row, or closes it when it is the open one. */
    toggle: (id: string) => request(id === openId ? null : id),
    /** Only closes the row it was asked for, so a save that ends late cannot close or reopen another. Opens the row that waited for the save. */
    close: (id: string) =>
      setOpen((current) => (current.openId === id ? { openId: current.pending?.next ?? null, pending: null } : current)),
    guard,
  };
}

/** Tells the page when an editor's draft is dirty and when it is saving, and that neither holds once the editor is gone. */
export function useReportDirty(dirty: boolean, saving: boolean, guard: UnsavedGuard) {
  const { onDirtyChange, onSavingChange } = guard;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => onSavingChange(saving), [saving, onSavingChange]);
  useEffect(
    () => () => {
      onDirtyChange(false);
      onSavingChange(false);
    },
    [onDirtyChange, onSavingChange],
  );
}
