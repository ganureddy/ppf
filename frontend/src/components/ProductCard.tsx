import { useCart, useSetCartItem } from "@/api/hooks";
import { useFavorites } from "@/store/favorites";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";
import { HeartIcon, MinusIcon, PlusIcon } from "./icons";

function Thumb({ product }: { product: Product }) {
	if (product.image) {
		return <img src={product.image} alt="" className="h-full w-full object-cover" />;
	}
	return (
		<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ppf-green/15 to-ppf-mint">
			<span className="text-3xl font-bold text-ppf-green">{product.item_name.charAt(0)}</span>
		</div>
	);
}

export function ProductCard({ product }: { product: Product }) {
	const { data: cart } = useCart();
	const setItem = useSetCartItem();
	const { ids, toggle } = useFavorites();
	const saved = ids.includes(product.item_code);
	const line = cart?.items.find((i) => i.item_code === product.item_code);
	const qty = line?.qty ?? 0;
	const outOfStock = product.published_stock != null && product.published_stock <= 0;

	const setQty = (n: number) => setItem.mutate({ item_code: product.item_code, qty: Math.max(0, n) });

	return (
		<div className="flex flex-col rounded-card bg-white p-2.5 shadow-card">
			<div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-ppf-bg">
				<Thumb product={product} />
				<button
					onClick={() => toggle(product.item_code)}
					aria-label="Save"
					className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow ${
						saved ? "text-ppf-danger" : "text-ppf-muted"
					}`}
				>
					<HeartIcon width={16} height={16} fill={saved ? "currentColor" : "none"} />
				</button>
			</div>

			<p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-ppf-text">
				{product.item_name}
			</p>
			<p className="mt-0.5 text-xs text-ppf-subtext">{product.uom}</p>

			<div className="mt-2 flex items-center justify-between">
				<span className="font-bold text-ppf-text">{formatMoney(product.rate, product.currency)}</span>
				{outOfStock ? (
					<span className="text-[10px] font-semibold text-ppf-danger">Out</span>
				) : qty > 0 ? (
					<div className="flex items-center gap-2 rounded-full bg-ppf-green px-1.5 py-1 text-white">
						<button aria-label="Decrease" onClick={() => setQty(qty - 1)}>
							<MinusIcon width={15} height={15} />
						</button>
						<span className="min-w-4 text-center text-sm font-bold">{qty}</span>
						<button aria-label="Increase" onClick={() => setQty(qty + 1)}>
							<PlusIcon width={15} height={15} />
						</button>
					</div>
				) : (
					<button
						onClick={() => setQty(1)}
						disabled={setItem.isPending}
						aria-label="Add"
						className="flex h-9 w-9 items-center justify-center rounded-full bg-ppf-green text-white shadow-glow disabled:opacity-60"
					>
						<PlusIcon width={20} height={20} />
					</button>
				)}
			</div>
		</div>
	);
}
