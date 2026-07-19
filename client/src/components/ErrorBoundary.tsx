import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NEURAL CORE EXCEPTION]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-xl border border-red-900/60 bg-black/95 p-6 rounded-lg font-mono text-center text-red-500 space-y-4 crt-overlay shadow-[0_0_50px_rgba(255,0,0,0.2)]">
          <h2 className="text-xl font-bold glitch-text uppercase tracking-wider">
            ⚠ NEURAL LINK CRITICAL EXCEPTION
          </h2>
          <p className="text-xs text-red-400">
            An unexpected error occurred in the Red Queen neural interface.
          </p>
          <div className="text-[10px] bg-red-950/40 border border-red-900/50 p-3 rounded text-left overflow-x-auto text-red-300 max-h-32">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full p-3 bg-red-950/30 border border-red-500 text-xs font-bold uppercase hover:bg-red-500 hover:text-black transition rounded cursor-pointer tracking-widest"
          >
            Re-initialize Neural Shell
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
