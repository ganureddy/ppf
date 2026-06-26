import { useState } from "react";
import { getMonthlyReportPdf, useMonthlyReport } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { useToast } from "@/store/toast";
import { frappeError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { MonthlyReport } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="mt-3 rounded-card bg-white p-4 shadow-card">
			<h3 className="mb-2 font-semibold text-ppf-text">{title}</h3>
			{children}
		</div>
	);
}

function downloadCsv(data: MonthlyReport) {
	const header = ["Order", "Customer", "Date", "Status", "Total", "Paid", "Pending"];
	const rows = data.all_orders.map((o) => [
		o.name, o.customer_name, o.transaction_date, o.status, o.grand_total, o.paid, o.pending,
	]);
	const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
	const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `Monthly-Report-${data.month.replace(/\s/g, "-")}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

export default function Report() {
	const { data, isLoading } = useMonthlyReport();
	const { push } = useToast();
	const [pdfBusy, setPdfBusy] = useState(false);
	if (isLoading || !data) return <Loading />;
	const c = data.currency;

	async function downloadPdf() {
		setPdfBusy(true);
		try {
			const { url } = await getMonthlyReportPdf();
			window.open(url, "_blank");
		} catch (e) {
			push(frappeError(e, "Could not generate PDF"), "error");
		} finally {
			setPdfBusy(false);
		}
	}

	return (
		<div className="p-4 pb-6">
			<div className="rounded-card bg-gradient-to-br from-ppf-purple-deep to-ppf-purple p-4 text-white shadow-card">
				<p className="text-sm text-white/80">{data.month}</p>
				<p className="text-2xl font-bold">{formatMoney(data.total_sales, c)}</p>
				<p className="text-sm text-white/80">{data.order_count} orders this month</p>
			</div>

			<div className="mt-3 flex gap-2">
				<button onClick={() => downloadCsv(data)} className="flex-1 rounded-xl border border-ppf-purple py-2.5 text-sm font-semibold text-ppf-purple">
					⬇ Excel
				</button>
				<button onClick={downloadPdf} disabled={pdfBusy} className="flex-1 rounded-xl bg-ppf-purple py-2.5 text-sm font-semibold text-white disabled:opacity-60">
					{pdfBusy ? "Generating…" : "⬇ PDF"}
				</button>
			</div>

			<Section title="Top 5 Customers">
				{data.top_customers.length === 0 ? (
					<p className="text-sm text-ppf-subtext">No data</p>
				) : (
					data.top_customers.map((r, i) => (
						<div key={r.customer_name} className="flex items-center justify-between border-b border-ppf-border py-2 text-sm last:border-0">
							<span className="text-ppf-text">{i + 1}. {r.customer_name} <span className="text-ppf-muted">· {r.orders} orders</span></span>
							<span className="font-semibold text-ppf-text">{formatMoney(r.amount, c)}</span>
						</div>
					))
				)}
			</Section>

			<Section title="Top 5 Orders">
				{data.top_orders.map((r, i) => (
					<div key={r.name} className="flex items-center justify-between border-b border-ppf-border py-2 text-sm last:border-0">
						<span className="text-ppf-text">{i + 1}. {r.customer_name} <span className="text-ppf-muted">· {r.name}</span></span>
						<span className="font-semibold text-ppf-text">{formatMoney(r.amount, c)}</span>
					</div>
				))}
			</Section>

			<Section title="Top 5 Products">
				{data.top_products.map((r, i) => (
					<div key={r.item_name} className="flex items-center justify-between border-b border-ppf-border py-2 text-sm last:border-0">
						<span className="text-ppf-text">{i + 1}. {r.item_name} <span className="text-ppf-muted">· {r.qty} sold</span></span>
						<span className="font-semibold text-ppf-text">{formatMoney(r.amount, c)}</span>
					</div>
				))}
			</Section>

			<Section title={`All Orders (${data.all_orders.length})`}>
				{data.all_orders.length === 0 ? (
					<p className="text-sm text-ppf-subtext">No orders this month</p>
				) : (
					data.all_orders.map((o) => (
						<div key={o.name} className="border-b border-ppf-border py-2 text-sm last:border-0">
							<div className="flex items-center justify-between">
								<span className="font-medium text-ppf-text">{o.customer_name}</span>
								<span className="font-semibold text-ppf-text">{formatMoney(o.grand_total, c)}</span>
							</div>
							<div className="flex items-center justify-between text-xs text-ppf-subtext">
								<span>{o.name} · {o.transaction_date} · {o.status}</span>
								{o.pending > 0 ? (
									<span className="text-ppf-danger">Due {formatMoney(o.pending, c)}</span>
								) : (
									<span className="text-ppf-green">Paid</span>
								)}
							</div>
						</div>
					))
				)}
			</Section>
		</div>
	);
}
