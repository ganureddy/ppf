export function formatMoney(amount: number, currency = "INR"): string {
	const symbol = currency === "INR" ? "₹" : "";
	const value = (amount ?? 0).toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return `${symbol}${value}`;
}

export function formatDate(date?: string): string {
	if (!date) return "—";
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return date;
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Resolve a stepper qty into a human pack label, e.g. qty 2 of "100 gm" -> "200 gm". */
export function resolvePackLabel(qty: number, uom: string): string {
	const match = /^([\d.]+)\s*(.+)$/.exec(uom.trim());
	if (match) {
		const base = parseFloat(match[1]);
		const unit = match[2];
		if (!Number.isNaN(base)) {
			const total = base * qty;
			return `${Number.isInteger(total) ? total : total.toFixed(2)} ${unit}`;
		}
	}
	return `${qty} ${uom}`;
}
