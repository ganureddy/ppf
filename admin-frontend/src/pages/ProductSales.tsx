import { useState } from "react";
import { useProductSalesReport } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";

function isoDaysAgo(n: number) {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 10);
}

export default function ProductSales() {
	const [from, setFrom] = useState(isoDaysAgo(30));
	const [to, setTo] = useState(isoDaysAgo(0));
	const { data, isLoading } = useProductSalesReport(from, to);
	const field = "w-full rounded-lg border border-ppf-border bg-white px-3 py-2 text-sm outline-none focus:border-ppf-purple";

	return (
		<div className="p-4">
			<div className="rounded-card bg-white p-4 shadow-card">
				<h2 className="font-semibold text-ppf-text">Product Sales Report</h2>
				<div className="mt-3 grid grid-cols-2 gap-3">
					<div>
						<label className="mb-1 block text-xs text-ppf-subtext">From</label>
						<input type="date" className={field} value={from} onChange={(e) => setFrom(e.target.value)} />
					</div>
					<div>
						<label className="mb-1 block text-xs text-ppf-subtext">To</label>
						<input type="date" className={field} value={to} onChange={(e) => setTo(e.target.value)} />
					</div>
				</div>
			</div>

			{isLoading ? (
				<Loading />
			) : !data || data.products.length === 0 ? (
				<p className="mt-6 text-center text-sm text-ppf-subtext">No sales in this period.</p>
			) : (
				<div className="mt-3 overflow-hidden rounded-card bg-white shadow-card">
					<div className="grid grid-cols-12 gap-1 border-b border-ppf-border bg-ppf-purple-light px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ppf-purple-deep">
						<span className="col-span-5">Product</span>
						<span className="col-span-2 text-right">Total Qty</span>
						<span className="col-span-2 text-right">Highest</span>
						<span className="col-span-3 text-right">Top Customer</span>
					</div>
					{data.products.map((p) => (
						<div key={p.item_name} className="grid grid-cols-12 gap-1 border-b border-ppf-border px-3 py-2.5 text-sm last:border-0">
							<span className="col-span-5 font-medium text-ppf-text">{p.item_name}</span>
							<span className="col-span-2 text-right text-ppf-text">{p.total_qty}</span>
							<span className="col-span-2 text-right text-ppf-text">{p.highest_qty}</span>
							<span className="col-span-3 truncate text-right text-ppf-subtext">{p.top_customer}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
