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

export function todayISO(): string {
	return new Date().toISOString().slice(0, 10);
}
