import { useState } from "react";
import { Link } from "react-router-dom";
import {
	useChangeDeliveryDay,
	useMarkPaid,
	useOrders,
	useSetFulfillment,
	useUnmarkPaid,
} from "@/api/hooks";
import { useToast } from "@/store/toast";
import { frappeError } from "@/lib/api";
import type { Order } from "@/lib/types";
import { CardSkeleton, EmptyState } from "./EmptyState";
import { OrderCard, type MiddleAction } from "./OrderCard";
import { OrderEditModal } from "./OrderEditModal";
import { PlusIcon, SearchIcon, SlidersIcon } from "./icons";

export function OrderListScreen({
	title = "Orders",
	subtitle,
	variant = "manage",
	middleActionFor,
}: {
	title?: string;
	subtitle?: string;
	variant?: "manage" | "bill";
	middleActionFor: (order: Order, helpers: { refetch: () => void }) => MiddleAction;
}) {
	const [q, setQ] = useState("");
	const [editing, setEditing] = useState<string | null>(null);
	const { data, isLoading, refetch } = useOrders(q);
	const changeDay = useChangeDeliveryDay();
	const markPaid = useMarkPaid();
	const unmarkPaid = useUnmarkPaid();
	const setFulfillment = useSetFulfillment();
	const { push } = useToast();

	async function onSetFulfillment(order: Order, status: string) {
		const prev = order.fulfillment_status || "Received";
		try {
			await setFulfillment.mutateAsync({ sales_order: order.name, status });
			push(`${order.name} → ${status}`, "success", {
				action: {
					label: "Undo",
					onClick: async () => {
						try {
							await setFulfillment.mutateAsync({ sales_order: order.name, status: prev });
							push(`Reverted to ${prev}`);
						} catch (e) {
							push(frappeError(e, "Could not undo"), "error");
						}
					},
				},
			});
		} catch (e) {
			push(frappeError(e, "Could not update status"), "error");
		}
	}

	const orders = data?.orders ?? [];

	async function onMarkPaid(order: Order) {
		try {
			const r = await markPaid.mutateAsync(order.name);
			push(`${order.name} → ${r.payment_status}`, "success", {
				action: {
					label: "Undo",
					onClick: async () => {
						try {
							await unmarkPaid.mutateAsync(order.name);
							push("Payment reversed");
						} catch (e) {
							push(frappeError(e, "Could not undo payment"), "error");
						}
					},
				},
			});
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

	const accent = variant === "bill" ? "bg-ppf-green" : "bg-ppf-purple";

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
				<h2 className="font-semibold text-ppf-text">{title}</h2>
				<span className={`rounded-full ${accent} px-2.5 py-0.5 text-xs font-semibold text-white`}>
					{data?.total ?? 0}
				</span>
				{variant === "manage" && (
					<Link
						to="/create-order"
						className="ml-auto flex items-center gap-1 rounded-full bg-ppf-purple px-3 py-1.5 text-xs font-semibold text-white"
					>
						<PlusIcon width={14} height={14} /> New Order
					</Link>
				)}
			</div>
			{subtitle && <p className="mb-3 -mt-1 text-sm text-ppf-subtext">{subtitle}</p>}

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
							onEdit={() => setEditing(order.name)}
							onChangeDeliveryDay={(date) => onChangeDeliveryDay(order, date)}
							markPaid={{
								onClick: () => onMarkPaid(order),
								loading: markPaid.isPending && markPaid.variables === order.name,
							}}
							fulfillment={
								variant === "manage"
									? {
											status: order.fulfillment_status || "Received",
											onSet: (s) => onSetFulfillment(order, s),
											loading: setFulfillment.isPending,
										}
									: undefined
							}
						/>
					))}
				</div>
			)}

			{editing && (
				<OrderEditModal orderName={editing} onClose={() => setEditing(null)} onSaved={() => refetch()} />
			)}
		</div>
	);
}
