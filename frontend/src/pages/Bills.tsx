import { useBills } from "@/api/hooks";
import { PurpleHeader } from "@/components/Header";
import { EmptyState, Loading } from "@/components/EmptyState";
import { CartIcon } from "@/components/icons";
import { formatDate, formatMoney } from "@/lib/format";

const CLOSED = ["Paid", "Return", "Credit Note Issued"];

export default function Bills() {
	const { data, isLoading } = useBills();
	return (
		<div>
			<PurpleHeader title="My Bills" left={<CartIcon width={22} height={22} />} />
			<div className="p-3">
				{isLoading ? (
					<Loading />
				) : !data || data.length === 0 ? (
					<EmptyState caption="No bills available" />
				) : (
					<div className="space-y-3 pb-4">
						{data.map((bill) => {
							const closed = CLOSED.includes(bill.status);
							return (
								<div
									key={bill.name}
									className="rounded-card bg-white p-4 shadow-card"
								>
									<div className="flex items-center justify-between">
										<p className="font-semibold text-ppf-text">{bill.name}</p>
										<span
											className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
												closed
													? "bg-ppf-accent-green/30 text-ppf-green"
													: "bg-ppf-danger/15 text-ppf-danger"
											}`}
										>
											{bill.status}
										</span>
									</div>
									<div className="mt-2 flex items-center justify-between text-sm text-ppf-subtext">
										<span>{formatDate(bill.posting_date)}</span>
										<span className="text-base font-semibold text-ppf-text">
											{formatMoney(bill.grand_total, bill.currency)}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
