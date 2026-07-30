import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-950 p-6 rounded-lg shadow-xl text-center border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              An unexpected error occurred in the application. The technical details have been logged.
            </p>
            {this.state.error && (
              <div className="mb-6 text-left bg-slate-100 dark:bg-slate-900 p-3 rounded overflow-auto max-h-32 text-xs font-mono text-red-800 dark:text-red-400">
                {this.state.error.message}
              </div>
            )}
            <Button onClick={this.handleReload} className="w-full flex items-center justify-center">
              <RefreshCw className="w-4 h-4 mr-2" /> Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
