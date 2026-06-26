import { useNavigate } from "react-router-dom";
import { useMe } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { logout } from "@/lib/api";
import {
	BagIcon,
	BellIcon,
	ChevronRightIcon,
	InfoIcon,
	LocationIcon,
	PowerIcon,
	RupeeIcon,
	SearchIcon,
	SupportIcon,
	UserIcon,
} from "@/components/icons";

const APP_VERSION = "v0.2.0";

function Row({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
	return (
		<button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
			<span className="text-ppf-green">{icon}</span>
			<span className="flex-1 font-medium text-ppf-text">{label}</span>
			<ChevronRightIcon width={18} height={18} className="text-ppf-muted" />
		</button>
	);
}

export default function Profile() {
	const navigate = useNavigate();
	const { data: me, isLoading } = useMe();

	async function onLogout() {
		try {
			await logout();
		} finally {
			window.location.assign("/customer/login");
		}
	}

	if (isLoading) return <Loading />;

	return (
		<div className="min-h-full">
			<header className="bg-gradient-to-br from-ppf-green-deep to-ppf-green pb-8 pt-12 text-center text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}>
				<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
					<UserIcon width={40} height={40} />
				</div>
				<p className="mt-2 text-xl font-bold">{me?.name}</p>
				{me?.phone && <p className="text-sm text-white/85">{me.phone}</p>}
				{!me?.phone && me?.email && <p className="text-sm text-white/85">{me.email}</p>}
			</header>

			<div className="p-4">
				<div className="divide-y divide-ppf-border overflow-hidden rounded-card bg-white shadow-card">
					<Row icon={<BagIcon width={20} height={20} />} label="My Orders" onClick={() => navigate("/orders")} />
					<Row icon={<RupeeIcon width={20} height={20} />} label="My Bills" onClick={() => navigate("/bills")} />
					<Row icon={<SearchIcon width={20} height={20} />} label="My Insights" onClick={() => navigate("/insights")} />
					<Row icon={<LocationIcon width={20} height={20} />} label="Phone & Address" onClick={() => navigate("/profile/edit")} />
					<Row icon={<BellIcon width={20} height={20} />} label="Notifications" />
					<Row icon={<SupportIcon width={20} height={20} />} label="Support" />
					<Row icon={<InfoIcon width={20} height={20} />} label="About App" />
				</div>

				<button onClick={onLogout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ppf-green py-3.5 font-bold text-ppf-green">
					<PowerIcon width={20} height={20} />
					Log Out
				</button>
				<p className="mt-4 text-center text-xs text-ppf-subtext">Purple Patch Farms {APP_VERSION}</p>
			</div>
		</div>
	);
}
