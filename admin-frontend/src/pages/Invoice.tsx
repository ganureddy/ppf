import { useState } from "react";
import { useInvoices } from "@/api/hooks";
import { CardSkeleton, EmptyState } from "@/components/EmptyState";
import { PrintIcon, ReceiptIcon, SearchIcon } from "@/components/icons";
import { formatDate, formatMoney } from "@/lib/format";
import type { Invoice as InvoiceDoc } from "@/lib/types";

function statusClass(status: string): string {
	const s = status.toLowerCase();
	if (s === "paid") return "bg-ppf-green/15 text-ppf-green";
	if (s === "overdue") return "bg-ppf-danger/15 text-ppf-danger";
	if (s.includes("partly")) return "bg-amber-100 text-amber-700";
	return "bg-ppf-purple-light text-ppf-purple";
}

function printInvoice(name: string) {
	const url = `/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent(
		"Sales Invoice",
	)}&name=${encodeURIComponent(name)}&no_letterhead=0`;
	window.open(url, "_blank");
}

function InvoiceCard({ inv }: { inv: InvoiceDoc }) {
	const paid = (inv.grand_total ?? 0) - (inv.outstanding_amount ?? 0);
	return (
		<div className="rounded-card bg-white p-4 shadow-card">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ppf-purple-light text-ppf-purple">
						<ReceiptIcon width={18} height={18} />
					</div>
					<div>
						<p className="font-semibold text-ppf-text">{inv.customer_name || inv.customer}</p>
						<p className="text-xs text-ppf-subtext">
							{inv.name} · {formatDate(inv.posting_date)}
						</p>
					</div>
				</div>
				<span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(inv.status)}`}>
					{inv.status}
				</span>
			</div>

			<div className="mt-3 grid grid-cols-3 gap-2 text-center">
				<div className="rounded-lg bg-ppf-bg py-2">
					<p className="text-[10px] uppercase tracking-wide text-ppf-muted">Total</p>
					<p className="text-sm font-semibold text-ppf-text">{formatMoney(inv.grand_total, inv.currency)}</p>
				</div>
				<div className="rounded-lg bg-ppf-bg py-2">
					<p className="text-[10px] uppercase tracking-wide text-ppf-muted">Paid</p>
					<p className="text-sm font-semibold text-ppf-green">{formatMoney(paid, inv.currency)}</p>
				</div>
				<div className="rounded-lg bg-ppf-bg py-2">
					<p className="text-[10px] uppercase tracking-wide text-ppf-muted">Due</p>
					<p className="text-sm font-semibold text-ppf-danger">{formatMoney(inv.outstanding_amount, inv.currency)}</p>
				</div>
			</div>

			<button
				onClick={() => printInvoice(inv.name)}
				className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-ppf-purple-light py-2 text-sm font-semibold text-ppf-purple"
			>
				<PrintIcon width={16} height={16} /> Download PDF
			</button>
		</div>
	);
}

export default function Invoice() {
	const [q, setQ] = useState("");
	const { data, isLoading } = useInvoices(q);
	const invoices = data?.invoices ?? [];

	return (
		<div className="p-3">
			<div className="relative mb-3">
				<SearchIcon width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ppf-subtext" />
				<input
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Search customer"
					className="w-full rounded-full border border-black/5 bg-white py-3 pl-10 pr-4 shadow-card outline-none focus:border-ppf-purple"
				/>
			</div>

			<div className="mb-3 flex items-center gap-2">
				<h2 className="font-semibold text-ppf-text">Invoices</h2>
				<span className="rounded-full bg-ppf-purple px-2.5 py-0.5 text-xs font-semibold text-white">
					{data?.total ?? 0}
				</span>
			</div>

			{isLoading ? (
				<CardSkeleton />
			) : invoices.length === 0 ? (
				<EmptyState caption="No invoices yet — create one from Bill Now" />
			) : (
				<div className="space-y-3 pb-4">
					{invoices.map((inv) => (
						<InvoiceCard key={inv.name} inv={inv} />
					))}
				</div>
			)}
		</div>
	);
}
