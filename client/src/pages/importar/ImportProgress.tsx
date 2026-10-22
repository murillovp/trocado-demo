import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UploadStep } from '@/api/upload';
import { Notice } from '@/components/Notice';
import { stepText } from '@/lib/importSteps';

/**
 * A spinner, the step the import is on, and the seconds since it started, so
 * the screen never sits still while work runs (spec 1).
 */
export function ImportProgress({ step, isSwile }: { step: UploadStep | null; isSwile: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Notice role="status" className="flex-row items-center gap-3">
      <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
      <span className="flex-1">{stepText(step ?? { step: 'upload', percent: 0 }, isSwile)}</span>
      <span className="tabular-nums text-muted-foreground">{seconds} s</span>
    </Notice>
  );
}
