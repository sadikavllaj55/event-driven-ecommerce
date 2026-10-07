import { Component, type ReactNode } from 'react';

export default class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section role="alert">
          <h1 className="text-xl font-semibold mb-3">
            This page could not be loaded
          </h1>
          <button
            className="text-teal-600 hover:underline"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
