import { useNavigate } from "react-router-dom";
import { useCart, useDeliveryConfig, useSetCartItem } from "@/api/hooks";
import { EmptyState, Loading } from "@/components/EmptyState";
import { BackIcon, CloseIcon, MinusIcon, PlusIcon, TruckIcon } from "@/components/icons";
import { formatMoney } from "@/lib/format";

export default function Cart() {
	const navigate = useNavigate();
	const { data: cart, isLoading } = useCart();
	const { data: delivery } = useDeliveryConfig();

	const setItem = useSetCartItem();

	if (isLoading) return <Loading />;

	const currency = cart?.currency ?? "INR";
	const items = cart?.items ?? [];
	const subtotal = cart?.total ?? 0;

	// Delivery fee is admin-controlled (PPF Settings).
	const dEnabled = !!delivery?.enabled;
	const freeAbove = delivery?.free_above ?? 0;
	const dAmount = delivery?.amount ?? 0;
	const showProgress = dEnabled && freeAbove > 0;
	const freeShip = showProgress && subtotal >= freeAbove;
	const fee = !dEnabled || subtotal === 0 || freeShip ? 0 : dAmount;
	const pct = showProgress ? Math.min((subtotal / freeAbove) * 100, 100) : 0;
	const remaining = showProgress ? Math.max(freeAbove - subtotal, 0) : 0;

	return (
		<div className="flex h-full flex-col bg-ppf-bg">
			<header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 pb-3 shadow-sm" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}>
				<button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ppf-bg">
					<BackIcon width={20} height={20} />
				</button>
				<h1 className="text-lg font-bold text-ppf-text">My Basket</h1>
				<div className="w-9" />
			</header>

			{items.length === 0 ? (
				<EmptyState caption="Your basket is empty" />
			) : (
				<>
					<div className="flex-1 overflow-y-auto p-4">
						{/* Free delivery progress (only when admin enabled a free-above threshold) */}
						{showProgress && (
							<div className="mb-3 rounded-card bg-white p-3 shadow-card">
								<div className="flex items-center justify-between text-sm">
									<span className="flex items-center gap-1.5 text-ppf-text">
										<TruckIcon width={16} height={16} className="text-ppf-purple" />
										{freeShip ? "You've unlocked free delivery!" : (
											<span>Free delivery in <span className="font-bold text-ppf-purple">{formatMoney(remaining, currency)}</span></span>
										)}
									</span>
									<span className="text-ppf-muted">{Math.round(pct)}%</span>
								</div>
								<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ppf-bg">
									<div className="h-full rounded-full bg-ppf-purple" style={{ width: `${pct}%` }} />
								</div>
							</div>
						)}

						<div className="space-y-3">
							{items.map((line) => (
								<div key={line.item_code} className="relative flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
									<div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ppf-green/15 to-ppf-mint text-lg font-bold text-ppf-green">
										{line.item_name.charAt(0)}
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate pr-5 font-semibold text-ppf-text">{line.item_name}</p>
										<p className="text-xs text-ppf-subtext">{line.uom}</p>
										<p className="mt-1 font-bold text-ppf-text">{formatMoney(line.rate, currency)}</p>
									</div>
									<button
										onClick={() => setItem.mutate({ item_code: line.item_code, qty: 0 })}
										className="absolute right-3 top-3 text-ppf-muted"
										aria-label="Remove"
									>
										<CloseIcon width={16} height={16} />
									</button>
									<div className="flex items-center gap-2 rounded-full bg-ppf-bg px-1.5 py-1">
										<button onClick={() => setItem.mutate({ item_code: line.item_code, qty: line.qty - 1 })} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-ppf-text" aria-label="Decrease">
											<MinusIcon width={15} height={15} />
										</button>
										<span className="min-w-5 text-center text-sm font-bold text-ppf-text">{line.qty}</span>
										<button onClick={() => setItem.mutate({ item_code: line.item_code, qty: line.qty + 1 })} className="flex h-7 w-7 items-center justify-center rounded-full bg-ppf-green text-white" aria-label="Increase">
											<PlusIcon width={15} height={15} />
										</button>
									</div>
								</div>
							))}
						</div>

						<div className="mt-3 flex items-center gap-2 rounded-card bg-white p-2 shadow-card">
							<input placeholder="Promo Code" className="flex-1 bg-transparent px-2 py-2 text-sm outline-none" />
							<button className="rounded-lg bg-ppf-bg px-4 py-2 text-sm font-semibold text-ppf-text">Apply</button>
						</div>
					</div>

					<div className="border-t border-ppf-border bg-white p-4">
						<div className="mb-1 flex justify-between text-sm text-ppf-subtext">
							<span>Subtotal</span>
							<span className="text-ppf-text">{formatMoney(subtotal, currency)}</span>
						</div>
						{dEnabled && (
							<div className="mb-2 flex justify-between text-sm text-ppf-subtext">
								<span>Delivery Fee</span>
								<span className="text-ppf-text">{fee ? formatMoney(fee, currency) : "Free"}</span>
							</div>
						)}
						<div className="mb-3 flex justify-between border-t border-dashed border-ppf-border pt-2 text-lg font-bold text-ppf-text">
							<span>Total</span>
							<span>{formatMoney(subtotal + fee, currency)}</span>
						</div>
						<button
							onClick={() => navigate("/checkout")}
							className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ppf-green py-4 text-lg font-bold text-white shadow-glow"
						>
							Checkout →
						</button>
					</div>
				</>
			)}
		</div>
	);
}
