import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useOrders } from "@/api/hooks";
import { EmptyState, Loading } from "@/components/EmptyState";
import { ChevronRightIcon } from "@/components/icons";
import { PaymentBadge } from "@/components/PaymentBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { handlePaymentCallback, payForOrder } from "@/lib/razorpay";
import { useToast } from "@/store/toast";

export default function Orders() {
	const { data, isLoading } = useOrders();
	const { push } = useToast();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [payingId, setPayingId] = useState<string | null>(null);

	useEffect(() => {
		handlePaymentCallback().then((r) => {
			if (!r) return;
			push(r.pending > 0 ? `Payment received. Pending ${formatMoney(r.pending, "INR")}` : "Order fully paid");
			qc.invalidateQueries({ queryKey: ["orders"] });
			qc.invalidateQueries({ queryKey: ["account-summary"] });
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function pay(e: React.MouseEvent, name: string) {
		e.stopPropagation();
		setPayingId(name);
		payForOrder(name, { onError: (m) => { setPayingId(null); push(m, "error"); } });
	}

	return (
		<div>
			<header className="sticky top-0 z-20 bg-ppf-bg px-4 pb-2 pt-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
				<h1 className="text-xl font-bold text-ppf-text">My Orders</h1>
			</header>
			<div className="p-4">
				{isLoading ? (
					<Loading />
				) : !data || data.length === 0 ? (
					<EmptyState caption="No orders found" />
				) : (
					<div className="space-y-3 pb-4">
						{data.map((order) => (
							<div
								key={order.name}
								onClick={() => navigate(`/orders/${encodeURIComponent(order.name)}`)}
								className="cursor-pointer rounded-card bg-white p-4 shadow-card"
							>
								<div className="flex items-center justify-between">
									<p className="font-semibold text-ppf-text">{order.name}</p>
									<div className="flex items-center gap-2">
										<PaymentBadge status={order.payment_status} />
										<ChevronRightIcon width={18} height={18} className="text-ppf-muted" />
									</div>
								</div>
								<div className="mt-2 flex items-center justify-between text-sm text-ppf-subtext">
									<span>Delivery: {formatDate(order.delivery_date)} · {order.status}</span>
									<span className="text-base font-semibold text-ppf-text">{formatMoney(order.grand_total, order.currency)}</span>
								</div>
								{(order.paid ?? 0) > 0 && (order.pending ?? 0) > 0 && (
									<p className="mt-1 text-xs text-ppf-subtext">Paid {formatMoney(order.paid ?? 0, order.currency)} · Pending {formatMoney(order.pending ?? 0, order.currency)}</p>
								)}
								{(order.pending ?? 0) > 0 && (
									<button onClick={(e) => pay(e, order.name)} disabled={payingId === order.name} className="mt-3 w-full rounded-xl bg-ppf-green py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-60">
										{payingId === order.name ? "Redirecting…" : `Pay ${formatMoney(order.pending ?? 0, order.currency)}`}
									</button>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
