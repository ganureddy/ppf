const STYLES: Record<string, string> = {
	Paid: "bg-ppf-accent-green/30 text-ppf-green",
	"Partially Paid": "bg-ppf-peach/40 text-[#9a5b00]",
	Overdue: "bg-ppf-danger/15 text-ppf-danger",
	"Pending Payment": "bg-ppf-purple-light text-ppf-purple",
};

export function PaymentBadge({ status }: { status?: string }) {
	if (!status) return null;
	const cls = STYLES[status] || "bg-black/5 text-ppf-subtext";
	return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}
