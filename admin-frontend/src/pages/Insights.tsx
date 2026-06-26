import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useInsights } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { PaymentBadge } from "@/components/PaymentBadge";
import { formatMoney } from "@/lib/format";

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
	return (
		<div className="rounded-card bg-white p-3 shadow-card">
			<p className="text-xs text-ppf-subtext">{label}</p>
			<p className="mt-1 text-lg font-bold" style={{ color }}>
				{value}
			</p>
		</div>
	);
}

export default function Insights() {
	const { data, isLoading } = useInsights();
	const [tab, setTab] = useState<"customer" | "order">("customer");

	if (isLoading || !data) return <Loading />;

	const c = data.currency;
	const s = data.summary;
	const collectedPct = s.total_sales ? Math.round((s.total_collected / s.total_sales) * 100) : 0;

	return (
		<div className="p-3 pb-6">
			<div className="grid grid-cols-2 gap-2">
				<StatCard label="Total Sales" value={formatMoney(s.total_sales, c)} color="#1A1A1A" />
				<StatCard label="Collected" value={formatMoney(s.total_collected, c)} color="#0B7A3B" />
				<StatCard label="Outstanding" value={formatMoney(s.total_outstanding, c)} color="#6B1170" />
				<StatCard label="Overdue" value={formatMoney(s.overdue_amount, c)} color="#E0504F" />
			</div>

			<div className="mt-3 rounded-card bg-white p-4 shadow-card">
				<div className="flex items-center justify-between text-sm">
					<span className="text-ppf-subtext">Collected vs Sales</span>
					<span className="font-semibold text-ppf-text">{collectedPct}%</span>
				</div>
				<div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-ppf-bg">
					<div className="h-full rounded-full bg-ppf-green" style={{ width: `${collectedPct}%` }} />
				</div>
				<p className="mt-2 text-xs text-ppf-subtext">
					{s.order_count} orders · {s.customers_with_dues} customers with dues
				</p>
			</div>

			<div className="mt-3 rounded-card bg-white p-4 shadow-card">
				<h3 className="mb-3 font-semibold text-ppf-text">Monthly Sales</h3>
				<ResponsiveContainer width="100%" height={180}>
					<BarChart data={data.monthly_sales} margin={{ left: -20, right: 4 }}>
						<XAxis dataKey="month" tick={{ fontSize: 11, fill: "#777" }} axisLine={false} tickLine={false} />
						<Tooltip formatter={(v: number) => [formatMoney(v, c), "Sales"]} cursor={{ fill: "rgba(107,17,112,0.06)" }} />
						<Bar dataKey="amount" radius={[4, 4, 0, 0]}>
							{data.monthly_sales.map((_, i) => (
								<Cell key={i} fill="#6B1170" />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>

			<div className="mt-4 flex gap-2">
				<button
					onClick={() => setTab("customer")}
					className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === "customer" ? "bg-ppf-purple text-white" : "bg-white text-ppf-purple shadow-card"}`}
				>
					By Customer
				</button>
				<button
					onClick={() => setTab("order")}
					className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === "order" ? "bg-ppf-purple text-white" : "bg-white text-ppf-purple shadow-card"}`}
				>
					By Order
				</button>
			</div>

			{tab === "customer" ? (
				<div className="mt-3 space-y-2">
					{data.by_customer.map((row) => (
						<div key={row.customer} className="rounded-card bg-white p-3 shadow-card">
							<div className="flex items-center justify-between">
								<span className="font-semibold text-ppf-text">{row.customer_name}</span>
								<span className="text-xs text-ppf-subtext">{row.credit_days}d credit · {row.orders} orders</span>
							</div>
							<div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs">
								<div><p className="text-ppf-subtext">Total</p><p className="font-semibold">{formatMoney(row.total, c)}</p></div>
								<div><p className="text-ppf-subtext">Paid</p><p className="font-semibold text-ppf-green">{formatMoney(row.paid, c)}</p></div>
								<div><p className="text-ppf-subtext">Outstanding</p><p className="font-semibold text-ppf-purple">{formatMoney(row.outstanding, c)}</p></div>
							</div>
							{row.overdue > 0 && (
								<p className="mt-1 text-right text-xs font-medium text-ppf-danger">Overdue {formatMoney(row.overdue, c)}</p>
							)}
						</div>
					))}
				</div>
			) : (
				<div className="mt-3 space-y-2">
					{data.by_order.map((row) => (
						<div key={row.name} className="rounded-card bg-white p-3 shadow-card">
							<div className="flex items-center justify-between">
								<span className="font-semibold text-ppf-text">{row.customer_name}</span>
								<PaymentBadge status={row.payment_status} />
							</div>
							<div className="mt-1 flex items-center justify-between text-xs text-ppf-subtext">
								<span>{row.name} · {row.transaction_date}</span>
								<span>
									<span className="text-ppf-green">{formatMoney(row.paid, c)}</span>
									{" / "}
									<span className="font-semibold text-ppf-text">{formatMoney(row.grand_total, c)}</span>
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
