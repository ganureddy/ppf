import { NavLink } from "react-router-dom";
import { DollarDocIcon, HomeIcon, ListIcon, ReceiptIcon, TruckIcon } from "./icons";

const tabs = [
	{ to: "/", label: "HOME", icon: HomeIcon, end: true },
	{ to: "/orders", label: "ORDERS", icon: ListIcon },
	{ to: "/bill-now", label: "BILL NOW", icon: DollarDocIcon },
	{ to: "/shipment", label: "SHIPMENT", icon: TruckIcon },
	{ to: "/invoice", label: "INVOICE", icon: ReceiptIcon },
];

export function BottomNav() {
	return (
		<nav
			className="sticky bottom-0 z-30 flex border-t border-black/5 bg-white"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			{tabs.map((t) => {
				const Icon = t.icon;
				return (
					<NavLink
						key={t.to}
						to={t.to}
						end={t.end}
						className={({ isActive }) =>
							`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
								isActive ? "text-ppf-purple" : "text-ppf-subtext"
							}`
						}
					>
						<Icon width={22} height={22} />
						{t.label}
					</NavLink>
				);
			})}
		</nav>
	);
}
