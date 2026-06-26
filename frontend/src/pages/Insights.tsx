import { useNavigate } from "react-router-dom";
import { useAccountSummary } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { BackIcon } from "@/components/icons";
import { formatMoney } from "@/lib/format";

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
	return (
		<div className="rounded-card bg-white p-4 shadow-card">
			<p className="text-2xl font-bold" style={{ color }}>{value}</p>
			<p className="mt-1 text-xs text-ppf-subtext">{label}</p>
		</div>
	);
}

export default function Insights() {
	const navigate = useNavigate();
	const { data, isLoading } = useAccountSummary();
	if (isLoading || !data) return <Loading />;
	const c = data.currency;
	const max = Math.max(...data.monthly_spend.map((m) => m.amount), 1);
	const collectedPct = data.total_billed ? Math.round((data.total_paid / data.total_billed) * 100) : 0;

	return (
		<div className="min-h-full bg-ppf-bg pb-6">
			<header className="sticky top-0 z-20 flex items-center gap-3 bg-white px-4 py-3 shadow-sm" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
				<button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ppf-bg"><BackIcon width={20} height={20} /></button>
				<h1 className="text-lg font-bold text-ppf-text">My Insights</h1>
			</header>

			<div className="p-4">
				<div className="grid grid-cols-2 gap-3">
					<Stat value={String(data.placed_orders)} label="Total Orders" color="#111827" />
					<Stat value={formatMoney(data.total_paid, c)} label="Total Paid" color="#0B7A3B" />
					<Stat value={formatMoney(data.outstanding, c)} label="Outstanding" color="#111827" />
					<Stat value={formatMoney(data.overdue, c)} label="Overdue" color="#EF4444" />
				</div>

				<div className="mt-3 rounded-card bg-white p-4 shadow-card">
					<div className="flex items-center justify-between text-sm">
						<span className="text-ppf-subtext">Paid vs Billed</span>
						<span className="font-semibold text-ppf-text">{collectedPct}%</span>
					</div>
					<div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-ppf-bg">
						<div className="h-full rounded-full bg-ppf-green" style={{ width: `${collectedPct}%` }} />
					</div>
					<div className="mt-2 flex justify-between text-xs text-ppf-subtext">
						<span>Active bills: {data.active_bills}</span>
						<span>Closed bills: {data.closed_bills}</span>
					</div>
				</div>

				<div className="mt-3 rounded-card bg-white p-4 shadow-card">
					<p className="mb-3 font-semibold text-ppf-text">Monthly Spend</p>
					<div className="flex h-36 items-end justify-between gap-1">
						{data.monthly_spend.map((m) => (
							<div key={m.month} className="flex flex-1 flex-col items-center gap-1">
								<div className="flex w-full items-end" style={{ height: 110 }}>
									<div className="w-full rounded-t bg-ppf-green" style={{ height: `${(m.amount / max) * 100}%`, minHeight: m.amount > 0 ? 4 : 0 }} />
								</div>
								<span className="text-[9px] text-ppf-muted">{m.month}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
