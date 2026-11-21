import React, { ErrorInfo, ReactNode } from 'react';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { IntelligencePanel, TacticalButton } from './ui/BlacksiteUI';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const lang = getSettings().language;
    const isRTL = ['ar', 'sa'].includes(lang);

    if (this.state.hasError) {
      let errorMessage = getUITranslation(lang, 'unexpectedError');
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes('Missing or insufficient permissions')) {
            errorMessage = getUITranslation(lang, 'noPermission');
          }
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div
          className="min-h-screen bg-bg-main text-text-main flex flex-col items-center justify-center p-6 text-center"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <IntelligencePanel className="p-7 max-w-md w-full border-[#963F46]/40">
            <h2 className="text-xl font-bold text-danger-text mb-3">
              {getUITranslation(lang, 'ohNo')}
            </h2>
            <p className="text-text-muted text-sm font-medium mb-6">{errorMessage}</p>
            <TacticalButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => window.location.reload()}
            >
              {getUITranslation(lang, 'reloadPage')}
            </TacticalButton>
          </IntelligencePanel>
        </div>
      );
    }

    return this.props.children;
  }
}
