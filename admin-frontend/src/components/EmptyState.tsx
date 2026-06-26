import { EmptyDocIcon } from "./icons";

export function EmptyState({ caption }: { caption: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-ppf-subtext">
			<EmptyDocIcon className="text-ppf-purple-light" />
			<p className="mt-4 text-sm">{caption}</p>
		</div>
	);
}

export function Spinner({ className = "" }: { className?: string }) {
	return (
		<div
			className={`h-6 w-6 animate-spin rounded-full border-2 border-ppf-purple-light border-t-ppf-purple ${className}`}
		/>
	);
}

export function Loading() {
	return (
		<div className="flex justify-center py-16">
			<Spinner />
		</div>
	);
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
	return (
		<div className="space-y-3 p-3">
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="h-28 animate-pulse rounded-card bg-black/5" />
			))}
		</div>
	);
}
