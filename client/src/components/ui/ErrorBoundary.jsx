import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const { fallback, title = 'Something went wrong' } = this.props;

    if (fallback) return fallback(this.state.error, () => this.setState({ error: null }));

    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-lg w-full">
          <div className="text-red-500 text-4xl mb-3">⚠</div>
          <h2 className="text-lg font-semibold text-red-800 mb-2">{title}</h2>
          <p className="text-sm text-red-600 mb-4 font-mono break-all">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
