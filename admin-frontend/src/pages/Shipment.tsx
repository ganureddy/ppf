import { useState } from "react";
import { fetchShipmentCompleted, fetchShipmentPending, useDispatch } from "@/api/hooks";
import { frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import type { Order, Shipment as ShipmentDoc } from "@/lib/types";
import { Spinner } from "@/components/EmptyState";
import { CloseIcon, StoreIcon } from "@/components/icons";

function DateCard({
	title,
	subtitle,
	cta,
	onFetch,
}: {
	title: string;
	subtitle: string;
	cta: string;
	onFetch: (date: string) => Promise<void>;
}) {
	const [date, setDate] = useState(todayISO());
	const [loading, setLoading] = useState(false);

	return (
		<div className="rounded-card bg-white p-4 shadow-card">
			<h3 className="font-semibold text-ppf-text">{title}</h3>
			<p className="mt-1 text-sm text-ppf-subtext">{subtitle}</p>
			<div className="mt-3 flex items-center gap-2">
				<div className="relative flex-1">
					<input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="w-full rounded-lg border border-black/10 bg-ppf-bg px-3 py-2.5 pr-9 text-sm"
					/>
					{date && (
						<button onClick={() => setDate("")} aria-label="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 text-ppf-subtext">
							<CloseIcon width={16} height={16} />
						</button>
					)}
				</div>
			</div>
			<button
				onClick={async () => {
					setLoading(true);
					try {
						await onFetch(date);
					} finally {
						setLoading(false);
					}
				}}
				disabled={loading}
				className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ppf-purple py-2.5 font-semibold text-white disabled:opacity-60"
			>
				{loading ? <Spinner className="border-white/40 border-t-white" /> : cta}
			</button>
		</div>
	);
}

export default function Shipment() {
	const [pending, setPending] = useState<Order[] | null>(null);
	const [completed, setCompleted] = useState<ShipmentDoc[] | null>(null);
	const dispatch = useDispatch();
	const { push } = useToast();

	async function loadPending(date: string) {
		try {
			const res = await fetchShipmentPending(date || undefined);
			setPending(res.orders);
			if (!res.orders.length) push("No pending orders for that date", "error");
		} catch (e) {
			push(frappeError(e, "Could not fetch pending orders"), "error");
		}
	}

	async function loadCompleted(date: string) {
		try {
			const res = await fetchShipmentCompleted(date || undefined);
			setCompleted(res.shipments);
			if (!res.shipments.length) push("No shipments for that date", "error");
		} catch (e) {
			push(frappeError(e, "Could not fetch shipments"), "error");
		}
	}

	async function doDispatch(order: Order) {
		try {
			const res = await dispatch.mutateAsync(order.name);
			if (res.submitted) push(`Dispatched · ${res.delivery_note}`);
			else push(`Delivery Note ${res.delivery_note} created as draft (review in ERPNext)`, "error");
			setPending((prev) => (prev ? prev.filter((o) => o.name !== order.name) : prev));
		} catch (e) {
			push(frappeError(e, "Could not dispatch"), "error");
		}
	}

	return (
		<div className="space-y-3 p-3">
			<DateCard
				title="Select Bill Date"
				subtitle="Please select a bill date to fetch pending orders."
				cta="Fetch Pending Orders"
				onFetch={loadPending}
			/>

			{pending && pending.length > 0 && (
				<div className="space-y-2">
					<h4 className="px-1 font-semibold text-ppf-text">Pending Orders ({pending.length})</h4>
					{pending.map((o) => (
						<div key={o.name} className="rounded-card bg-white p-4 shadow-card">
							<div className="flex items-center gap-2">
								<StoreIcon width={20} height={20} className="text-ppf-purple" />
								<span className="font-semibold text-ppf-text">{o.customer_name || o.customer}</span>
							</div>
							<div className="mt-1 flex items-center justify-between text-sm text-ppf-subtext">
								<span>Delivery: {formatDate(o.delivery_date)}</span>
								<span className="font-semibold text-ppf-text">{formatMoney(o.grand_total, o.currency)}</span>
							</div>
							<button
								onClick={() => doDispatch(o)}
								disabled={dispatch.isPending}
								className="mt-3 w-full rounded-lg bg-ppf-purple py-2 text-sm font-semibold text-white disabled:opacity-60"
							>
								{dispatch.isPending && dispatch.variables === o.name ? "Dispatching…" : "Dispatch (create Delivery Note)"}
							</button>
						</div>
					))}
				</div>
			)}

			<DateCard
				title="Select Shipped Date"
				subtitle="Please select a shipment date to fetch orders."
				cta="Fetch Completed Orders"
				onFetch={loadCompleted}
			/>

			{completed && completed.length > 0 && (
				<div className="space-y-2">
					<h4 className="px-1 font-semibold text-ppf-text">Completed Shipments ({completed.length})</h4>
					{completed.map((s) => (
						<div key={s.name} className="rounded-card bg-white p-4 shadow-card">
							<div className="flex items-center gap-2">
								<StoreIcon width={20} height={20} className="text-ppf-purple" />
								<span className="font-semibold text-ppf-text">{s.customer_name || s.customer}</span>
							</div>
							<div className="mt-1 flex items-center justify-between text-sm text-ppf-subtext">
								<span>{s.name} · {formatDate(s.posting_date)}</span>
								<span className="font-semibold text-ppf-text">{formatMoney(s.grand_total, s.currency)}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
