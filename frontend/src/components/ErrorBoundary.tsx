import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
	error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[PPF] render error", error, info);
	}

	render() {
		if (this.state.error) {
			return (
				<div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
					<h1 className="text-lg font-semibold text-ppf-text">Something went wrong</h1>
					<p className="max-w-sm text-sm text-ppf-subtext">
						Please close and reopen the app. If it keeps happening, share this message
						with support:
					</p>
					<pre className="max-w-full overflow-auto rounded-lg bg-black/5 p-3 text-left text-xs text-ppf-danger">
						{this.state.error.message}
					</pre>
					<button
						onClick={() => {
							location.reload();
						}}
						className="rounded-xl bg-ppf-purple px-5 py-2.5 font-semibold text-white"
					>
						Reload
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}
