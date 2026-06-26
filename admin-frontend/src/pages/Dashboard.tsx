import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useDashboard } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { formatDate, formatMoney } from "@/lib/format";

function monthStartISO(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayLocalISO(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Dashboard() {
	const [from, setFrom] = useState(monthStartISO());
	const [to, setTo] = useState(todayLocalISO());
	const { data, isLoading } = useDashboard({ from_date: from, to_date: to });

	if (isLoading || !data) return <Loading />;

	const currency = data.currency;
	const fc = data.forecast;
	const topMax = Math.max(1, ...data.top_products.map((p) => p.amount));
	const dateInput =
		"w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-ppf-purple";

	return (
		<div className="pb-6">
			<div className="bg-gradient-to-b from-ppf-purple-deep to-ppf-purple px-4 pb-8 pt-4 text-white">
				<div className="flex justify-end">
					<span className="rounded-full bg-white/15 px-3 py-1 text-xs">
						{formatDate(data.from_date)} – {formatDate(data.to_date)}
					</span>
				</div>
				<div className="mt-4">
					<p className="text-3xl font-bold">{formatMoney(data.total_sales, currency)}</p>
					<p className="text-sm text-white/75">Sales for selected range</p>
				</div>
				<div className="mt-4 grid grid-cols-2 gap-2">
					<div className="rounded-xl bg-white/15 px-3 py-2">
						<p className="text-[11px] uppercase tracking-wide text-white/70">Collected</p>
						<p className="text-lg font-bold">{formatMoney(data.total_collected, currency)}</p>
					</div>
					<div className="rounded-xl bg-white/15 px-3 py-2">
						<p className="text-[11px] uppercase tracking-wide text-white/70">Outstanding</p>
						<p className="text-lg font-bold">{formatMoney(data.total_outstanding, currency)}</p>
					</div>
				</div>
			</div>

			{/* Date range filter */}
			<div className="-mt-4 px-3">
				<div className="rounded-card bg-white p-3 shadow-card">
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="mb-1 block text-[11px] uppercase tracking-wide text-ppf-muted">From</label>
							<input type="date" className={dateInput} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
						</div>
						<div>
							<label className="mb-1 block text-[11px] uppercase tracking-wide text-ppf-muted">To</label>
							<input type="date" className={dateInput} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
						</div>
					</div>
				</div>
			</div>

			<div className="mt-3 px-3">
				<div className="grid grid-cols-3 gap-2">
					{data.month_cards.map((m) => (
						<div key={m.label} className="rounded-card bg-white p-3 text-center shadow-card">
							<p className="text-xs text-ppf-subtext">{m.label}</p>
							<p className="mt-1 font-bold text-ppf-text">{formatMoney(m.amount, currency)}</p>
							<p className={`mt-0.5 text-xs font-semibold ${m.delta < 0 ? "text-ppf-danger" : "text-ppf-green"}`}>
								{m.delta > 0 ? "+" : ""}
								{m.delta}%
							</p>
						</div>
					))}
				</div>
			</div>

			{/* Payment pending: count + amount */}
			<div className="mt-4 px-3">
				<div className="flex items-center justify-between rounded-card bg-white p-4 shadow-card">
					<div>
						<h3 className="font-semibold text-ppf-text">Payment Pending</h3>
						<p className="mt-0.5 text-sm text-ppf-subtext">
							{data.pending_invoices} invoice{data.pending_invoices === 1 ? "" : "s"} awaiting payment
						</p>
						<p className="mt-1 text-xl font-bold text-ppf-danger">{formatMoney(data.pending_amount, currency)}</p>
					</div>
					<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ppf-purple-light">
						<span className="text-2xl font-bold text-ppf-purple">{data.pending_invoices}</span>
					</div>
				</div>
			</div>

			{/* Top sales analysis */}
			<div className="mt-4 px-3">
				<div className="rounded-card bg-white p-4 shadow-card">
					<h3 className="mb-3 font-semibold text-ppf-text">Top Sales Analysis</h3>
					{data.top_products.length === 0 ? (
						<p className="py-4 text-center text-sm text-ppf-subtext">No sales in this range.</p>
					) : (
						<div className="space-y-3">
							{data.top_products.map((p, i) => (
								<div key={p.item_name}>
									<div className="mb-1 flex items-center justify-between text-sm">
										<span className="truncate font-medium text-ppf-text">
											{i + 1}. {p.item_name}
										</span>
										<span className="ml-2 shrink-0 font-semibold text-ppf-text">
											{formatMoney(p.amount, currency)}
										</span>
									</div>
									<div className="h-2 w-full overflow-hidden rounded-full bg-ppf-bg">
										<div
											className="h-full rounded-full bg-ppf-purple"
											style={{ width: `${Math.max(4, (p.amount / topMax) * 100)}%` }}
										/>
									</div>
									<p className="mt-0.5 text-[11px] text-ppf-subtext">{p.qty} sold</p>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Forecast & prediction */}
			<div className="mt-4 px-3">
				<div className="rounded-card bg-white p-4 shadow-card">
					<div className="mb-1 flex items-center justify-between">
						<h3 className="font-semibold text-ppf-text">Forecast & Prediction</h3>
						<span
							className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
								fc.trend_pct < 0 ? "bg-ppf-danger/15 text-ppf-danger" : "bg-ppf-green/15 text-ppf-green"
							}`}
						>
							{fc.trend_pct > 0 ? "▲ +" : fc.trend_pct < 0 ? "▼ " : ""}
							{fc.trend_pct}%
						</span>
					</div>
					<p className="text-sm text-ppf-subtext">Projected next month (from last 4 weeks)</p>
					<p className="mt-1 text-2xl font-bold text-ppf-purple">{formatMoney(fc.predicted_next_month, currency)}</p>
					<p className="mt-0.5 text-xs text-ppf-subtext">
						Daily avg {formatMoney(fc.daily_avg, currency)} · last 30 days {formatMoney(fc.basis_total, currency)}
					</p>

					<ResponsiveContainer width="100%" height={180} className="mt-3">
						<BarChart data={fc.points} margin={{ left: -20, right: 4 }}>
							<XAxis dataKey="label" tick={{ fontSize: 10, fill: "#777" }} axisLine={false} tickLine={false} />
							<Tooltip
								cursor={{ fill: "rgba(107,17,112,0.06)" }}
								formatter={(v: number, _n, item) => [
									formatMoney(v, currency),
									(item?.payload as { forecast?: boolean })?.forecast ? "Forecast" : "Actual",
								]}
							/>
							<Bar dataKey="amount" radius={[4, 4, 0, 0]}>
								{fc.points.map((pt, i) => (
									<Cell key={i} fill={pt.forecast ? "#C9A8E9" : "#6B1170"} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
					<div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-ppf-subtext">
						<span className="flex items-center gap-1">
							<span className="inline-block h-2.5 w-2.5 rounded-sm bg-ppf-purple" /> Actual
						</span>
						<span className="flex items-center gap-1">
							<span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#C9A8E9" }} /> Forecast
						</span>
					</div>
				</div>
			</div>

			<div className="mt-4 px-3">
				<div className="rounded-card bg-white p-4 shadow-card">
					<h3 className="mb-3 font-semibold text-ppf-text">Monthly Sales</h3>
					<ResponsiveContainer width="100%" height={200}>
						<BarChart data={data.monthly_sales} margin={{ left: -20, right: 4 }}>
							<XAxis dataKey="month" tick={{ fontSize: 11, fill: "#777" }} axisLine={false} tickLine={false} />
							<Tooltip
								cursor={{ fill: "rgba(107,17,112,0.06)" }}
								formatter={(v: number) => [formatMoney(v, currency), "Sales"]}
							/>
							<Bar dataKey="amount" radius={[4, 4, 0, 0]}>
								{data.monthly_sales.map((_, i) => (
									<Cell key={i} fill="#6B1170" />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	);
}
