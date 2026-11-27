import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RabaPay Uncaught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    try {
      sessionStorage.removeItem('rabapay_current_view');
    } catch {}
    if (this.props.onReset) {
      this.props.onReset();
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7FDF9] text-[#1C1917] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#0F4024]/10 shadow-xl p-6 sm:p-8 space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-[#1C1917]">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h1>
              <p className="text-sm text-[#57534E]">
                {this.state.error?.message || 'An unexpected rendering error occurred. You can safely return home or reload the page.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] font-semibold text-sm transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Go to home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
