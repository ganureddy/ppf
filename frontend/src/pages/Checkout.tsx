import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddress, useCart, useCheckout, useDeliveryConfig } from "@/api/hooks";
import { Loading, Spinner } from "@/components/EmptyState";
import { BackIcon, CheckIcon, LocationIcon, TruckIcon } from "@/components/icons";
import { frappeError } from "@/lib/api";
import { payForOrder } from "@/lib/razorpay";
import { useToast } from "@/store/toast";
import { formatMoney } from "@/lib/format";

const TAX_RATE = 0;

export default function Checkout() {
	const navigate = useNavigate();
	const { data: cart, isLoading } = useCart();
	const { data: address } = useAddress();
	const { data: deliveryCfg } = useDeliveryConfig();
	const checkout = useCheckout();
	const { push } = useToast();
	const [method, setMethod] = useState<"standard" | "express">("standard");
	const [placed, setPlaced] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	if (isLoading) return <Loading />;

	const currency = cart?.currency ?? "INR";
	const subtotal = cart?.total ?? 0;
	// Admin-controlled delivery fee.
	const dEnabled = !!deliveryCfg?.enabled;
	const freeAbove = deliveryCfg?.free_above ?? 0;
	const delivery = !dEnabled || subtotal === 0 || (freeAbove > 0 && subtotal >= freeAbove)
		? 0
		: deliveryCfg?.amount ?? 0;
	const tax = Math.round(subtotal * TAX_RATE);
	const total = subtotal + delivery + tax;
	const addrText = address
		? [address.address_line1, address.address_line2, address.city, address.state, address.pincode].filter(Boolean).join(", ")
		: "";

	async function placeOrder() {
		setBusy(true);
		try {
			const res = await checkout.mutateAsync();
			setPlaced(res.sales_order);
		} catch (e) {
			push(frappeError(e, "Could not place your order."), "error");
		} finally {
			setBusy(false);
		}
	}

	function payNow() {
		if (!placed) return;
		setBusy(true);
		payForOrder(placed, { onError: (m) => { setBusy(false); push(m, "error"); } });
	}

	const methodCard = (id: "standard" | "express", title: string, sub: string) => (
		<button
			onClick={() => setMethod(id)}
			className={`flex-1 rounded-card border-2 p-3 text-left ${method === id ? "border-ppf-green bg-ppf-green/5" : "border-ppf-border bg-white"}`}
		>
			<TruckIcon width={20} height={20} className="text-ppf-text" />
			<p className="mt-1 font-bold text-ppf-text">{title}</p>
			<p className="text-xs text-ppf-subtext">{sub}</p>
		</button>
	);

	return (
		<div className="flex h-full flex-col bg-ppf-bg">
			<header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 shadow-sm" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
				<button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ppf-bg">
					<BackIcon width={20} height={20} />
				</button>
				<h1 className="text-lg font-bold text-ppf-text">Checkout</h1>
				<div className="w-9" />
			</header>

			<div className="flex-1 space-y-3 overflow-y-auto p-4">
				{/* Address */}
				<div className="rounded-card bg-white p-4 shadow-card">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold uppercase tracking-wide text-ppf-muted">Delivery Address</span>
						<button onClick={() => navigate("/profile")} className="text-sm font-semibold text-ppf-green">Edit</button>
					</div>
					<div className="mt-2 flex gap-2">
						<LocationIcon width={20} height={20} className="text-ppf-muted" />
						<p className="text-sm text-ppf-text">{addrText || "No address yet — tap Edit to add one."}</p>
					</div>
				</div>

				{/* Method */}
				<div>
					<p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-ppf-muted">Delivery Method</p>
					<div className="flex gap-3">
						{methodCard("standard", "Standard", "2–3 Days")}
						{methodCard("express", "Express", `${formatMoney(49, currency)} · Same day`)}
					</div>
				</div>

				{/* Summary */}
				<div className="rounded-card bg-white p-4 shadow-card">
					<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ppf-muted">Summary</p>
					<div className="flex justify-between py-1 text-sm text-ppf-subtext"><span>Subtotal</span><span className="text-ppf-text">{formatMoney(subtotal, currency)}</span></div>
					{dEnabled && (
						<div className="flex justify-between py-1 text-sm text-ppf-subtext"><span>Delivery Fee</span><span className="text-ppf-text">{delivery ? formatMoney(delivery, currency) : "Free"}</span></div>
					)}
					{tax > 0 && <div className="flex justify-between py-1 text-sm text-ppf-subtext"><span>Tax</span><span className="text-ppf-text">{formatMoney(tax, currency)}</span></div>}
					<div className="mt-1 flex justify-between border-t border-ppf-border pt-2 text-lg font-bold text-ppf-text"><span>Total</span><span className="text-ppf-green">{formatMoney(total, currency)}</span></div>
				</div>
			</div>

			<div className="border-t border-ppf-border bg-white p-4">
				{!placed ? (
					<button onClick={placeOrder} disabled={busy || subtotal === 0} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ppf-green py-4 text-lg font-bold text-white shadow-glow disabled:opacity-60">
						{busy ? <Spinner className="border-ppf-text/30 border-t-ppf-text" /> : "Place Order →"}
					</button>
				) : (
					<div className="space-y-2">
						<p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-ppf-green">
							<CheckIcon width={18} height={18} /> Order {placed} placed
						</p>
						<button onClick={payNow} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ppf-green py-4 text-lg font-bold text-white shadow-glow disabled:opacity-60">
							{busy ? <Spinner className="border-ppf-text/30 border-t-ppf-text" /> : "Pay Now"}
						</button>
						<button onClick={() => navigate("/orders")} className="w-full rounded-2xl border border-ppf-border py-3.5 font-bold text-ppf-text">
							Pay Later
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
