import { useState } from "react";
import { useChangeDeliveryDay, useMarkPaid, useOrders, useSetFulfillment } from "@/api/hooks";
import { useToast } from "@/store/toast";
import { frappeError } from "@/lib/api";
import type { Order } from "@/lib/types";
import { CardSkeleton, EmptyState } from "./EmptyState";
import { OrderCard, type MiddleAction } from "./OrderCard";
import { SearchIcon, SlidersIcon } from "./icons";

export function OrderListScreen({
	middleActionFor,
}: {
	middleActionFor: (order: Order, helpers: { refetch: () => void }) => MiddleAction;
}) {
	const [q, setQ] = useState("");
	const { data, isLoading, refetch } = useOrders(q);
	const changeDay = useChangeDeliveryDay();
	const markPaid = useMarkPaid();
	const setFulfillment = useSetFulfillment();
	const { push } = useToast();

	async function onSetFulfillment(order: Order, status: string) {
		try {
			await setFulfillment.mutateAsync({ sales_order: order.name, status });
			push(`${order.name} → ${status}`);
		} catch (e) {
			push(frappeError(e, "Could not update status"), "error");
		}
	}

	const orders = data?.orders ?? [];

	async function onMarkPaid(order: Order) {
		try {
			const r = await markPaid.mutateAsync(order.name);
			push(`${order.name} → ${r.payment_status}`);
		} catch (e) {
			push(frappeError(e, "Could not mark as paid"), "error");
		}
	}

	async function onChangeDeliveryDay(order: Order, date: string) {
		try {
			await changeDay.mutateAsync({ sales_order: order.name, date });
			push("Delivery date updated");
		} catch (e) {
			push(frappeError(e, "Could not update delivery date"), "error");
		}
	}

	return (
		<div className="p-3">
			<div className="mb-3 flex items-center gap-2">
				<div className="relative flex-1">
					<SearchIcon width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ppf-subtext" />
					<input
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search customer"
						className="w-full rounded-full border border-black/5 bg-white py-3 pl-10 pr-4 shadow-card outline-none focus:border-ppf-purple"
					/>
				</div>
				<button className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ppf-purple shadow-card" aria-label="Filter">
					<SlidersIcon width={20} height={20} />
				</button>
			</div>

			<div className="mb-2 flex items-center gap-2">
				<h2 className="font-semibold text-ppf-text">Orders</h2>
				<span className="rounded-full bg-ppf-purple px-2.5 py-0.5 text-xs font-semibold text-white">
					{data?.total ?? 0}
				</span>
			</div>

			{isLoading ? (
				<CardSkeleton />
			) : orders.length === 0 ? (
				<EmptyState caption="No results found" />
			) : (
				<div className="space-y-3 pb-4">
					{orders.map((order) => (
						<OrderCard
							key={order.name}
							order={order}
							middleAction={middleActionFor(order, { refetch })}
							onChangeDeliveryDay={(date) => onChangeDeliveryDay(order, date)}
							markPaid={{
								onClick: () => onMarkPaid(order),
								loading: markPaid.isPending && markPaid.variables === order.name,
							}}
							fulfillment={{
								status: order.fulfillment_status || "Received",
								onSet: (s) => onSetFulfillment(order, s),
								loading: setFulfillment.isPending,
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}
