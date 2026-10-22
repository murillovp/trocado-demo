import { useState } from 'react';
import { Notice } from '@/components/Notice';
import { Button } from '@/components/ui/button';
import { plural } from '@/lib/format';

type Props = {
  lineCount: number;
  /** Lines that still need a kind or a category. */
  waiting: number;
  confirming: boolean;
  cancelling: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** What the discard ask says is lost. Nothing is named when the import has no new lines. */
function lossSentence(lineCount: number): string {
  if (lineCount === 0) return '';
  return lineCount === 1 ? 'O 1 lançamento lido será apagado. ' : `Os ${lineCount} lançamentos lidos serão apagados. `;
}

const WAITING_SENTENCE = 'Lançamentos sem tipo ficam fora dos totais até você escolher.';
const CONFIRM_SENTENCE =
  'Depois de confirmar, não dá para desfazer a importação. Você continua podendo corrigir cada lançamento em Transações. O que você corrigir vale para os próximos arquivos.';

/**
 * The two helper sentences of the confirm bar, for a phone. Below `md` the sticky bar keeps only the
 * counts and the buttons, so a third of the screen stays free; these sentences sit in a plain notice
 * after the list instead. From `md` up the bar carries them and this notice is hidden.
 */
export function ConfirmHelp({ waiting }: { waiting: number }) {
  return (
    <Notice className="gap-1 md:hidden">
      {waiting > 0 ? <p className="text-muted-foreground">{WAITING_SENTENCE}</p> : null}
      <p className="text-muted-foreground">{CONFIRM_SENTENCE}</p>
    </Notice>
  );
}

/**
 * The bar that stays on screen while a review is open: how many lines are ready, Confirmar, and a
 * discard that asks twice. Each side locks while the other one waits for the server. With no new
 * lines there is nothing to confirm, so Confirmar goes and the discard becomes the main button.
 *
 * Below `md` the bar is small: the counts line over the buttons, side by side when they fit, and the
 * helper sentences are in `ConfirmHelp` after the list. Its tallest steady height, with the buttons
 * stacked at 375 px, is what `html.review-screen` in index.css reserves as scroll padding:
 * 1 px border + 12 px padding + 20 px counts line (text-sm) + 8 px gap + 36 px button + 8 px gap +
 * 36 px button + 12 px padding + 1 px border = 134 px. From `md` up the bar keeps its wide layout.
 */
export function ConfirmBar({ lineCount, waiting, confirming, cancelling, onConfirm, onCancel }: Props) {
  const [askingDiscard, setAskingDiscard] = useState(false);
  const hasLines = lineCount > 0;
  return (
    <div className="sticky bottom-16 z-10 flex flex-col gap-2 rounded-xl border bg-background p-3 shadow-sm md:bottom-4 md:flex-row md:flex-wrap md:items-center md:gap-3 md:p-4">
      {hasLines ? (
        <div className="flex flex-col gap-1 text-sm md:min-w-64 md:flex-1">
          <span className="font-medium">
            {plural(lineCount - waiting, 'pronto', 'prontos')} · {waiting} esperando você
          </span>
          {waiting > 0 ? <span className="hidden text-muted-foreground md:inline">{WAITING_SENTENCE}</span> : null}
          <span className="hidden text-xs text-muted-foreground md:inline">{CONFIRM_SENTENCE}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
        {askingDiscard ? (
          <>
            <span className="basis-full text-sm md:basis-auto">
              Descartar esta importação? {lossSentence(lineCount)}Você pode enviar o arquivo de novo.
            </span>
            <Button variant="destructive" className="flex-1 md:flex-none" loading={cancelling} disabled={confirming} onClick={onCancel}>
              Sim, descartar
            </Button>
            <Button variant="ghost" className="flex-1 md:flex-none" disabled={confirming} onClick={() => setAskingDiscard(false)}>
              Voltar
            </Button>
          </>
        ) : (
          <Button
            variant={hasLines ? 'ghost' : 'default'}
            className="flex-1 md:flex-none"
            disabled={confirming}
            onClick={() => setAskingDiscard(true)}
          >
            Descartar importação
          </Button>
        )}
        {hasLines ? (
          <Button className="flex-1 md:flex-none" loading={confirming} disabled={cancelling} onClick={onConfirm}>
            Confirmar {plural(lineCount, 'lançamento', 'lançamentos')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
