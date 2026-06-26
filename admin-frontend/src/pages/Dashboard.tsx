import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell } from "recharts";
import { useDashboard, useMe } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { formatMoney } from "@/lib/format";

export default function Dashboard() {
	const { data: me } = useMe();
	const { data, isLoading } = useDashboard();

	if (isLoading || !data) return <Loading />;

	const currency = data.currency;

	return (
		<div className="pb-6">
			<div className="bg-gradient-to-b from-ppf-purple-deep to-ppf-purple px-4 pb-8 pt-4 text-white">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 font-bold">
							{(me?.name ?? "A").charAt(0)}
						</div>
						<span className="font-semibold">My Analytics</span>
					</div>
					<span className="rounded-full bg-white/15 px-3 py-1 text-sm">{data.month}</span>
				</div>
				<div className="mt-5">
					<p className="text-3xl font-bold">{formatMoney(data.total_sales, currency)}</p>
					<p className="text-sm text-white/75">Total sales as of today</p>
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

			<div className="-mt-4 px-3">
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

			<div className="mt-4 px-3">
				<div className="flex items-center justify-between rounded-card bg-white p-4 shadow-card">
					<div>
						<h3 className="font-semibold text-ppf-text">Payment Pending</h3>
						<p className="mt-0.5 text-sm text-ppf-subtext">Invoices awaiting payment</p>
					</div>
					<div className="flex h-14 w-14 items-center justify-center rounded-full bg-ppf-purple-light">
						<span className="text-2xl font-bold text-ppf-purple">{data.pending_invoices}</span>
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
