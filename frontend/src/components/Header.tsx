import type { ReactNode } from "react";

export function PurpleHeader({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
	return (
		<header className="sticky top-0 z-20 bg-ppf-purple text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
			<div className="relative flex h-14 items-center justify-center px-4">
				<div className="absolute left-3 flex items-center">{left}</div>
				<h1 className="text-lg font-semibold">{title}</h1>
				<div className="absolute right-3 flex items-center gap-3">{right}</div>
			</div>
		</header>
	);
}
