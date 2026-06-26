import type { ReactNode } from "react";
import { MenuIcon } from "./icons";

export function PurpleHeader({
	title,
	onMenu,
	right,
}: {
	title: string;
	onMenu: () => void;
	right?: ReactNode;
}) {
	return (
		<header className="sticky top-0 z-30 bg-gradient-to-r from-ppf-purple-deep to-ppf-purple text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
			<div className="relative flex h-14 items-center justify-center px-4">
				<button onClick={onMenu} aria-label="Menu" className="absolute left-3">
					<MenuIcon width={24} height={24} />
				</button>
				<h1 className="text-lg font-semibold">{title}</h1>
				<div className="absolute right-3 flex items-center gap-3">{right}</div>
			</div>
		</header>
	);
}
