import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useProducts } from "@/api/hooks";
import { EmptyState, Loading } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { SearchIcon, SlidersIcon } from "@/components/icons";

export default function Catalog() {
	const [params] = useSearchParams();
	const [search, setSearch] = useState("");
	const [group, setGroup] = useState<string>(params.get("group") || "All");
	const { data, isLoading } = useProducts(search);

	const groups = useMemo(() => {
		const set = new Set<string>();
		(data || []).forEach((p) => p.item_group && set.add(p.item_group));
		return ["All", ...Array.from(set)];
	}, [data]);

	const products = useMemo(
		() => (group === "All" ? data || [] : (data || []).filter((p) => p.item_group === group)),
		[data, group],
	);

	return (
		<div>
			<div className="sticky top-0 z-20 bg-ppf-bg px-4 pb-2 pt-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
				<h1 className="mb-3 text-xl font-bold text-ppf-text">Catalog</h1>
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<SearchIcon width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ppf-muted" />
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search fresh veggies, fruits…"
							className="w-full rounded-full border border-ppf-border bg-white py-3 pl-10 pr-4 text-ppf-text shadow-card outline-none focus:border-ppf-green"
						/>
					</div>
					<button className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ppf-green shadow-card" aria-label="Filter">
						<SlidersIcon width={20} height={20} />
					</button>
				</div>
				{groups.length > 1 && (
					<div className="mt-3 flex gap-2 overflow-x-auto pb-1">
						{groups.map((g) => (
							<button
								key={g}
								onClick={() => setGroup(g)}
								className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
									group === g ? "bg-ppf-green text-white" : "bg-white text-ppf-subtext shadow-card"
								}`}
							>
								{g}
							</button>
						))}
					</div>
				)}
			</div>

			<div className="p-4">
				{isLoading ? (
					<Loading />
				) : products.length === 0 ? (
					<EmptyState caption="No results found" />
				) : (
					<div className="grid grid-cols-2 gap-3 pb-4">
						{products.map((p) => (
							<ProductCard key={p.item_code} product={p} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
