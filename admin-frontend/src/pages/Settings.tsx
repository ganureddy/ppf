import { useEffect, useState } from "react";
import { useSettings, useUpdateSettings } from "@/api/hooks";
import { Loading, Spinner } from "@/components/EmptyState";
import { frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";

export default function Settings() {
	const { data, isLoading } = useSettings();
	const update = useUpdateSettings();
	const { push } = useToast();
	const [enabled, setEnabled] = useState(false);
	const [amount, setAmount] = useState("0");
	const [freeAbove, setFreeAbove] = useState("0");

	useEffect(() => {
		if (data) {
			setEnabled(data.enabled);
			setAmount(String(data.amount ?? 0));
			setFreeAbove(String(data.free_above ?? 0));
		}
	}, [data]);

	if (isLoading) return <Loading />;
	const field = "w-full rounded-lg border border-ppf-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ppf-purple";

	async function save() {
		try {
			await update.mutateAsync({
				delivery_charge_enabled: enabled ? 1 : 0,
				delivery_charge_amount: parseFloat(amount || "0"),
				free_delivery_above: parseFloat(freeAbove || "0"),
			});
			push("Settings saved");
		} catch (e) {
			push(frappeError(e, "Could not save"), "error");
		}
	}

	return (
		<div className="p-4">
			<div className="rounded-card bg-white p-4 shadow-card">
				<h2 className="font-semibold text-ppf-text">Delivery Charges</h2>
				<p className="mt-1 text-sm text-ppf-subtext">Control whether a delivery fee is added at checkout.</p>

				<label className="mt-4 flex items-center justify-between">
					<span className="font-medium text-ppf-text">Enable delivery charges</span>
					<input type="checkbox" className="h-5 w-5 accent-[#7C3AED]" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
				</label>

				{enabled && (
					<div className="mt-4 space-y-3">
						<div>
							<label className="mb-1 block text-sm font-medium text-ppf-text">Delivery charge (₹)</label>
							<input className={field} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25" />
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium text-ppf-text">Free delivery above (₹) — 0 to never offer free</label>
							<input className={field} type="number" step="0.01" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} placeholder="e.g. 500" />
						</div>
					</div>
				)}

				<button onClick={save} disabled={update.isPending} className="mt-5 flex w-full items-center justify-center rounded-xl bg-ppf-purple py-3 font-semibold text-white disabled:opacity-60">
					{update.isPending ? <Spinner className="border-white/30 border-t-white" /> : "Save Settings"}
				</button>
			</div>
		</div>
	);
}
