import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full flex items-center justify-center p-6" data-testid="error-boundary">
          <div className="glass rounded-2xl p-6 max-w-md text-center">
            <div className="mono-label text-[#FF003C] mb-2">// MODULE CRASH</div>
            <h3 className="font-heading text-lg font-bold text-white mb-2">Something broke in this app.</h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">{String(this.state.error?.message || this.state.error)}</p>
            <button onClick={this.reset} className="neon-btn primary">Reload module</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
