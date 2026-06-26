import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PurpleHeader } from "./Header";
import { BottomNav } from "./BottomNav";
import { Drawer } from "./Drawer";

const TITLES: Record<string, string> = {
	"/": "My Analytics",
	"/orders": "Orders",
	"/bill-now": "Bill Now",
	"/shipment": "Select Date",
	"/invoice": "Invoice",
	"/products": "Products",
	"/customers": "Customers",
	"/insights": "Insights & Reports",
	"/report": "Monthly Report",
	"/product-sales": "Product Sales",
	"/settings": "Settings",
	"/tally": "Tally Integration",
};

export function Layout() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const { pathname } = useLocation();
	const title = TITLES[pathname] ?? "Purple Patch Farms";

	return (
		<div className="mx-auto flex h-full max-w-[520px] flex-col bg-ppf-bg">
			<PurpleHeader title={title} onMenu={() => setDrawerOpen(true)} />
			<Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
			<main className="flex-1 overflow-y-auto">
				<Outlet />
			</main>
			<BottomNav />
		</div>
	);
}
