import { useState } from "react";
import type { Order } from "@/lib/types";
import { getOrderPdfUrl } from "@/api/hooks";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { CalendarIcon, PrintIcon, StoreIcon } from "./icons";
import { Spinner } from "./EmptyState";
import { PaymentBadge } from "./PaymentBadge";

export type MiddleAction = {
	label: string;
	onClick: () => void;
	loading?: boolean;
};

export type MarkPaid = {
	onClick: () => void;
	loading?: boolean;
};

export type Fulfillment = {
	status: string;
	onSet: (status: string) => void;
	loading?: boolean;
};

const FLOW = ["Received", "Processing", "Dispatched", "Delivered"];

export function OrderCard({
	order,
	middleAction,
	onChangeDeliveryDay,
	onEdit,
	markPaid,
	fulfillment,
}: {
	order: Order;
	middleAction: MiddleAction;
	onChangeDeliveryDay: (date: string) => Promise<void> | void;
	onEdit?: () => void;
	markPaid?: MarkPaid;
	fulfillment?: Fulfillment;
}) {
	const [picking, setPicking] = useState(false);
	const [date, setDate] = useState(order.delivery_date || todayISO());
	const [saving, setSaving] = useState(false);
	const [printing, setPrinting] = useState(false);

	async function printInvoice() {
		setPrinting(true);
		try {
			const { url } = await getOrderPdfUrl(order.name);
			window.open(url, "_blank");
		} finally {
			setPrinting(false);
		}
	}

	async function confirmDate() {
		setSaving(true);
		try {
			await onChangeDeliveryDay(date);
			setPicking(false);
		} finally {
			setSaving(false);
		}
	}

	const btn =
		"flex-1 rounded-lg bg-ppf-purple-light py-2 text-sm font-semibold text-ppf-purple";

	return (
		<div className="rounded-card bg-white p-4 shadow-card">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<StoreIcon width={22} height={22} className="text-ppf-purple" />
					<span className="font-semibold text-ppf-text">{order.customer_name || order.customer}</span>
				</div>
				<button onClick={printInvoice} disabled={printing} aria-label="Print" className="text-ppf-subtext">
					<PrintIcon width={20} height={20} />
				</button>
			</div>

			<div className="mt-3 flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm text-ppf-subtext">
					<CalendarIcon width={18} height={18} />
					<span>
						Delivery Date{" "}
						<span className="font-medium text-ppf-text">{formatDate(order.delivery_date)}</span>
					</span>
				</div>
				<button
					onClick={() => setPicking((v) => !v)}
					className="rounded-lg bg-ppf-purple px-3 py-1.5 text-xs font-semibold text-white"
				>
					Change Delivery Day
				</button>
			</div>

			{picking && (
				<div className="mt-3 flex items-center gap-2 rounded-lg bg-ppf-bg p-2">
					<input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="flex-1 rounded-md border border-black/10 bg-white px-2 py-1.5 text-sm"
					/>
					<button
						onClick={confirmDate}
						disabled={saving}
						className="rounded-md bg-ppf-purple px-3 py-1.5 text-sm font-semibold text-white"
					>
						{saving ? "…" : "Save"}
					</button>
				</div>
			)}

			<div className="mt-2 flex items-center justify-between">
				<PaymentBadge status={order.payment_status} />
				<span className="text-sm font-semibold text-ppf-text">
					{formatMoney(order.grand_total, order.currency)} · {order.status}
				</span>
			</div>
			{(order.paid ?? 0) > 0 && (order.pending ?? 0) > 0 && (
				<p className="mt-1 text-right text-xs text-ppf-subtext">
					Paid {formatMoney(order.paid ?? 0, order.currency)} · Pending {formatMoney(order.pending ?? 0, order.currency)}
				</p>
			)}
			{markPaid && (order.pending ?? 0) > 0 && (
				<button
					onClick={markPaid.onClick}
					disabled={markPaid.loading}
					className="mt-2 w-full rounded-lg border border-ppf-green/40 py-2 text-sm font-semibold text-ppf-green disabled:opacity-60"
				>
					{markPaid.loading ? "Marking…" : "Mark as Paid"}
				</button>
			)}

			{fulfillment && (
				<div className="mt-3 border-t border-ppf-border pt-3">
					<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ppf-muted">
						Status: <span className="text-ppf-text">{fulfillment.status}</span>
					</p>
					<div className="flex gap-2">
						{FLOW.slice(1).map((s) => {
							const idx = FLOW.indexOf(s);
							const cur = FLOW.indexOf(fulfillment.status || "Received");
							const done = idx <= cur;
							return (
								<button
									key={s}
									onClick={() => fulfillment.onSet(s)}
									disabled={fulfillment.loading}
									className={`flex-1 rounded-lg py-2 text-xs font-semibold disabled:opacity-60 ${
										done ? "bg-ppf-purple text-white" : "bg-ppf-purple-light text-ppf-purple"
									}`}
								>
									{s === "Processing" ? "Process" : s}
								</button>
							);
						})}
					</div>
				</div>
			)}

			<div className="mt-3 flex gap-2">
				<button className={btn} onClick={onEdit}>
					Edit
				</button>
				<button
					className={`${btn} ${middleAction.label === "Delete" ? "!bg-ppf-danger/10 !text-ppf-danger" : ""}`}
					onClick={middleAction.onClick}
					disabled={middleAction.loading}
				>
					{middleAction.loading ? <Spinner className="mx-auto h-4 w-4" /> : middleAction.label}
				</button>
				<button className={btn} onClick={printInvoice} disabled={printing}>
					{printing ? "…" : "Preview"}
				</button>
			</div>
		</div>
	);
}
