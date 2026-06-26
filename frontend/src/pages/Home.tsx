import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAddress, useMe, useProducts } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { BellIcon, LocationIcon, SearchIcon, TruckIcon } from "@/components/icons";

const LOGO = "https://ppf.emrid.store/files/172355246554z5jjLtKL.png";

export default function Home() {
	const navigate = useNavigate();
	const { data: me } = useMe();
	const { data: address } = useAddress();
	const { data: products, isLoading } = useProducts("");

	const groups = useMemo(() => {
		const set = new Set<string>();
		(products || []).forEach((p) => p.item_group && set.add(p.item_group));
		return Array.from(set).slice(0, 8);
	}, [products]);

	const deliverTo =
		[address?.city, address?.state].filter(Boolean).join(", ") || me?.name || "Add your address";

	return (
		<div className="pb-4">
			{/* Delivery header */}
			<header className="sticky top-0 z-20 bg-ppf-bg px-4 pb-2 pt-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
				<div className="flex items-center justify-between">
					<button onClick={() => navigate("/profile")} className="flex items-center gap-1.5 text-left">
						<LocationIcon width={20} height={20} className="text-ppf-green" />
						<span>
							<span className="block text-[10px] font-semibold uppercase tracking-wide text-ppf-muted">Delivering to</span>
							<span className="block text-sm font-bold text-ppf-text">{deliverTo}</span>
						</span>
					</button>
					<div className="flex items-center gap-3">
						<img src={LOGO} alt="" className="h-8 w-8 rounded-full object-contain" />
						<BellIcon width={22} height={22} className="text-ppf-text" />
					</div>
				</div>

				<button
					onClick={() => navigate("/catalog")}
					className="mt-3 flex w-full items-center gap-2 rounded-full bg-white px-4 py-3 text-left text-ppf-muted shadow-card"
				>
					<SearchIcon width={18} height={18} />
					Search fresh veggies, fruits…
				</button>
			</header>

			{/* Deal banner */}
			<div className="px-4 pt-3">
				<div className="overflow-hidden rounded-card bg-gradient-to-br from-ppf-green-deep to-[#0EB50E] p-5 text-white">
					<span className="inline-block rounded-md bg-ppf-green px-2 py-0.5 text-[10px] font-bold uppercase text-white">
						Deal of the day
					</span>
					<h2 className="mt-2 text-xl font-bold leading-tight">Farm‑fresh produce, delivered</h2>
					<p className="mt-1 text-sm text-white/80">Hand‑picked vegetables & fruits every day.</p>
					<button
						onClick={() => navigate("/catalog")}
						className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-bold text-ppf-text"
					>
						Shop Now →
					</button>
				</div>
			</div>

			{/* Categories */}
			{groups.length > 0 && (
				<div className="px-4 pt-5">
					<div className="mb-2 flex items-center justify-between">
						<h3 className="font-bold text-ppf-text">Categories</h3>
						<button onClick={() => navigate("/catalog")} className="text-sm font-semibold text-ppf-green">See All</button>
					</div>
					<div className="flex gap-3 overflow-x-auto pb-1">
						{groups.map((g) => (
							<button key={g} onClick={() => navigate(`/catalog?group=${encodeURIComponent(g)}`)} className="flex flex-col items-center gap-1">
								<span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-bold text-ppf-green shadow-card">
									{g.charAt(0)}
								</span>
								<span className="max-w-[64px] truncate text-xs text-ppf-subtext">{g}</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Fresh Picks */}
			<div className="px-4 pt-5">
				<h3 className="mb-2 font-bold text-ppf-text">Fresh Picks For You</h3>
				{isLoading ? (
					<Loading />
				) : (
					<div className="grid grid-cols-2 gap-3">
						{(products || []).slice(0, 12).map((p) => (
							<ProductCard key={p.item_code} product={p} />
						))}
					</div>
				)}
			</div>

			{/* Free delivery banner */}
			<div className="px-4 pt-5">
				<div className="flex items-center justify-between rounded-card bg-ppf-green-deep p-4 text-white">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-ppf-green">Free delivery</p>
						<p className="text-sm font-bold">Order over ₹500, get free shipping</p>
					</div>
					<TruckIcon width={28} height={28} className="text-ppf-green" />
				</div>
			</div>
		</div>
	);
}
