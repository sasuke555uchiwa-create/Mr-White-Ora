import React, { Component, ErrorInfo, ReactNode } from 'react';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';

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
    error: null
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
          if (parsed.error && parsed.error.includes("Missing or insufficient permissions")) {
            errorMessage = getUITranslation(lang, 'noPermission');
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-bg-dark text-text-main flex flex-col items-center justify-center p-6 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-bg-card p-8 rounded-3xl shadow-lg max-w-md w-full border border-border">
            <h2 className="text-2xl font-bold text-danger mb-4">{getUITranslation(lang, 'ohNo')}</h2>
            <p className="text-text-muted mb-6">{errorMessage}</p>
            <button
              className="btn-chunky w-full py-3 bg-primary text-white rounded-xl font-black"
              onClick={() => window.location.reload()}
            >
              {getUITranslation(lang, 'reloadPage')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
