import { NavLink, useNavigate } from "react-router-dom";
import { useMe } from "@/api/hooks";
import { logout } from "@/lib/api";
import { BoxIcon, ChartIcon, CloseIcon, DollarDocIcon, HomeIcon, ListIcon, PowerIcon, ReceiptIcon, SlidersIcon, TruckIcon, UserIcon } from "./icons";

const LOGO = "https://ppf.emrid.store/files/172355246554z5jjLtKL.png";

const links = [
	{ to: "/", label: "Home", icon: HomeIcon, end: true },
	{ to: "/orders", label: "Orders", icon: ListIcon },
	{ to: "/bill-now", label: "Bill Now", icon: DollarDocIcon },
	{ to: "/shipment", label: "Shipment", icon: TruckIcon },
	{ to: "/invoice", label: "Invoice", icon: ReceiptIcon },
	{ to: "/products", label: "Products", icon: BoxIcon },
	{ to: "/customers", label: "Customers", icon: UserIcon },
	{ to: "/insights", label: "Insights & Reports", icon: ChartIcon },
	{ to: "/report", label: "Monthly Report", icon: ChartIcon },
	{ to: "/product-sales", label: "Product Sales", icon: BoxIcon },
	{ to: "/tally", label: "Tally Integration", icon: DollarDocIcon },
	{ to: "/settings", label: "Settings", icon: SlidersIcon },
];

export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
	const { data: me } = useMe();
	const navigate = useNavigate();

	async function onLogout() {
		try {
			await logout();
		} finally {
			window.location.assign("/admin/login");
		}
	}

	return (
		<>
			<div
				className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
					open ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
				onClick={onClose}
			/>
			<aside
				className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col bg-white shadow-xl transition-transform ${
					open ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="bg-gradient-to-b from-ppf-purple-deep to-ppf-purple p-5 text-white">
					<div className="flex items-start justify-between">
						<img src={LOGO} alt="" className="h-12 w-12 rounded-full bg-white object-contain p-0.5" />
						<button onClick={onClose} aria-label="Close menu">
							<CloseIcon width={22} height={22} />
						</button>
					</div>
					<p className="mt-3 font-semibold">Purple Patch Farms</p>
					<p className="text-sm text-white/75">{me?.name ?? "Admin"}</p>
				</div>

				<nav className="flex-1 overflow-y-auto p-2">
					{links.map((l) => {
						const Icon = l.icon;
						return (
							<NavLink
								key={l.to}
								to={l.to}
								end={l.end}
								onClick={() => {
									onClose();
									navigate(l.to);
								}}
								className={({ isActive }) =>
									`flex items-center gap-3 rounded-lg px-3 py-3 font-medium ${
										isActive ? "bg-ppf-purple-light text-ppf-purple" : "text-ppf-text"
									}`
								}
							>
								<Icon width={20} height={20} />
								{l.label}
							</NavLink>
						);
					})}
				</nav>

				<button
					onClick={onLogout}
					className="m-3 flex items-center justify-center gap-2 rounded-xl border-2 border-ppf-purple py-3 font-semibold text-ppf-purple"
				>
					<PowerIcon width={20} height={20} />
					Log Out
				</button>
			</aside>
		</>
	);
}
