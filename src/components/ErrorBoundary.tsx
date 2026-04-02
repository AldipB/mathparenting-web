"use client";

import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-screen flex items-center justify-center">
          <div className="max-w-md mx-auto text-center space-y-4 p-6 border rounded-2xl shadow-sm bg-white">
            <div className="text-3xl">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
            <p className="text-gray-600 text-sm">
              The chat ran into an unexpected error. Please reload the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-blue-600 px-5 py-2 text-white font-semibold hover:bg-blue-700"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}