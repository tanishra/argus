import React from 'react';

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message + '\n' + error.stack;
  }
  return JSON.stringify(error, null, 2);
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: unknown }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="premium-card p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">An unexpected error occurred loading this section.</p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all"
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 text-xs text-muted-foreground text-left max-h-40 overflow-auto">
              {serializeError(this.state.error)}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
