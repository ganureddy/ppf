import { useProducts } from "@/api/hooks";
import { useFavorites } from "@/store/favorites";
import { EmptyState, Loading } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";

export default function Saved() {
	const { ids } = useFavorites();
	const { data, isLoading } = useProducts("");
	const saved = (data || []).filter((p) => ids.includes(p.item_code));

	return (
		<div>
			<header className="sticky top-0 z-20 bg-ppf-bg px-4 pb-2 pt-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
				<h1 className="text-xl font-bold text-ppf-text">Saved Items</h1>
			</header>
			<div className="p-4">
				{isLoading ? (
					<Loading />
				) : saved.length === 0 ? (
					<EmptyState caption="No saved items yet — tap the heart on a product" />
				) : (
					<div className="grid grid-cols-2 gap-3 pb-4">
						{saved.map((p) => (
							<ProductCard key={p.item_code} product={p} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
