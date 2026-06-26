import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function AppShell() {
	return (
		<div className="mx-auto flex h-full max-w-[480px] flex-col bg-ppf-bg">
			<main className="flex-1 overflow-y-auto">
				<Outlet />
			</main>
			<BottomNav />
		</div>
	);
}
