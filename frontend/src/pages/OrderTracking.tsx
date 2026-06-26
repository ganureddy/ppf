import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOrderDetail } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { PaymentBadge } from "@/components/PaymentBadge";
import { BackIcon, CheckIcon } from "@/components/icons";
import { formatDate, formatMoney } from "@/lib/format";
import { payForOrder } from "@/lib/razorpay";
import { useToast } from "@/store/toast";

export default function OrderTracking() {
	const { name = "" } = useParams();
	const navigate = useNavigate();
	const { data, isLoading } = useOrderDetail(name);
	const { push } = useToast();
	const [busy, setBusy] = useState(false);

	if (isLoading || !data) return <Loading />;
	const c = data.currency;

	function pay() {
		setBusy(true);
		payForOrder(name, { onError: (m) => { setBusy(false); push(m, "error"); } });
	}

	return (
		<div className="min-h-full bg-ppf-bg pb-6">
			<header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 shadow-sm" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
				<button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ppf-bg"><BackIcon width={20} height={20} /></button>
				<h1 className="text-base font-bold text-ppf-text">{data.name}</h1>
				<div className="w-9" />
			</header>

			{/* Status banner */}
			<div className="bg-ppf-green/10 px-5 py-6 text-center">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ppf-green text-white">
					<CheckIcon width={26} height={26} />
				</div>
				<h2 className="mt-2 text-xl font-bold text-ppf-text">{data.steps[data.current_step]?.label}</h2>
				<p className="text-sm text-ppf-subtext">Delivery: {formatDate(data.delivery_date)}</p>
			</div>

			{/* Timeline */}
			<div className="p-4">
				<div className="rounded-card bg-white p-4 shadow-card">
					{data.steps.map((s, i) => {
						const active = i <= data.current_step;
						const last = i === data.steps.length - 1;
						return (
							<div key={s.key} className="flex gap-3">
								<div className="flex flex-col items-center">
									<span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-ppf-green text-white" : "bg-ppf-bg text-ppf-muted"}`}>
										{active ? <CheckIcon width={16} height={16} /> : <span className="h-2 w-2 rounded-full bg-current" />}
									</span>
									{!last && <span className={`my-1 w-0.5 flex-1 ${i < data.current_step ? "bg-ppf-green" : "bg-ppf-border"}`} style={{ minHeight: 28 }} />}
								</div>
								<div className={`pb-4 ${active ? "" : "opacity-60"}`}>
									<p className={`font-semibold ${i === data.current_step ? "text-ppf-green" : "text-ppf-text"}`}>{s.label}</p>
									<p className="text-xs text-ppf-subtext">{s.desc}</p>
								</div>
							</div>
						);
					})}
				</div>

				{/* Payment */}
				<div className="mt-3 rounded-card bg-white p-4 shadow-card">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-ppf-text">Payment</span>
						<PaymentBadge status={data.payment_status} />
					</div>
					<div className="mt-2 flex items-center justify-between text-sm text-ppf-subtext">
						<span>Paid {formatMoney(data.paid, c)} / {formatMoney(data.grand_total, c)}</span>
						{data.pending > 0 && <span className="font-semibold text-ppf-danger">Due {formatMoney(data.pending, c)}</span>}
					</div>
					{data.pending > 0 && (
						<button onClick={pay} disabled={busy} className="mt-3 w-full rounded-xl bg-ppf-green py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-60">
							{busy ? "Redirecting…" : `Pay ${formatMoney(data.pending, c)}`}
						</button>
					)}
				</div>

				{/* Items */}
				<div className="mt-3 rounded-card bg-white p-4 shadow-card">
					<p className="mb-2 font-semibold text-ppf-text">Items</p>
					{data.items.map((it, i) => (
						<div key={i} className="flex items-center justify-between border-b border-ppf-border py-2 text-sm last:border-0">
							<span className="text-ppf-text">{it.item_name} <span className="text-ppf-muted">× {it.qty} {it.uom}</span></span>
							<span className="font-medium text-ppf-text">{formatMoney(it.amount, c)}</span>
						</div>
					))}
					<div className="mt-2 flex justify-between border-t border-ppf-border pt-2 font-bold text-ppf-text">
						<span>Total</span><span>{formatMoney(data.grand_total, c)}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
