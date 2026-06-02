import React, { Component, ErrorInfo, ReactNode } from 'react';
import { signInWithGoogle, FirestoreOperationError } from '../firebase';
import i18n from '../i18n';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const t = i18n.t;
      let displayMessage = t('common:somethingWentWrongBody', 'An error occurred. Please try refreshing the page.');
      let isFirestoreError = false;
      let isAuthError = false;
      let operationHint = '';

      if (this.state.error instanceof FirestoreOperationError) {
        isFirestoreError = true;
        const info = this.state.error.info as any;
        const hasAuth = info?.authInfo?.userId;
        isAuthError = !hasAuth;
        
        const operationType = String(info?.operationType || '');
        const path = String(info?.path || '');
        operationHint = t('common:databaseErrorHint', {
          operation: operationType,
          path,
          defaultValue: `Failed to ${operationType} ${path}`,
        });
        
        // Log the full error to console for debugging, do NOT display
        console.error('[ErrorBoundary] FirestoreOperationError full details:', info);
      } else if (this.state.error) {
        console.error('[ErrorBoundary] Uncaught error:', this.state.error);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-100">
            <h2 className="text-2xl font-bold text-red-600 mb-4">{t('common:somethingWentWrong', 'Something went wrong')}</h2>
            
            <p className="text-stone-700 mb-4">{displayMessage}</p>
            
            {isFirestoreError && operationHint && (
              <p className="text-sm text-stone-500 mb-4">{operationHint}</p>
            )}
            
            {isAuthError && (
              <div className="space-y-3 mb-4">
                <p className="text-amber-600 text-sm">{t('auth:pleaseSignIn', 'Please sign in to continue')}</p>
                <button
                  onClick={() => signInWithGoogle()}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-2 px-4 rounded-xl transition-colors shadow-sm"
                >
                  {t('auth:login', 'Sign in with Google')}
                </button>
              </div>
            )}

            <button
              className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl transition-colors"
              onClick={() => window.location.reload()}
            >
              {t('common:reload', 'Reload')}
            </button>
            
            <p className="mt-4 text-xs text-stone-400 text-center">
              {t('common:errorSupportHint', 'If this keeps happening, contact support with the time this occurred.')}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
