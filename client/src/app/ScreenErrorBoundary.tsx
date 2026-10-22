import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * Catches an error thrown while a screen draws, so the menu stays and the
 * page area says what happened. Layout keys it on the path, which gives each
 * screen a fresh start.
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A screen failed to draw', error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-5 text-sm">
        <p>Algo deu errado nesta tela.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
      </div>
    );
  }
}
