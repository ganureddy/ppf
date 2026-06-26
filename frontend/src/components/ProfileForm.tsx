import { useState } from "react";
import { useAddress, useMe, useSaveOnboarding } from "@/api/hooks";
import { Spinner } from "./EmptyState";
import { frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";

interface FormState {
	phone: string;
	address_line1: string;
	address_line2: string;
	city: string;
	state: string;
	pincode: string;
}

export function ProfileForm({ ctaLabel = "Save", onDone }: { ctaLabel?: string; onDone?: () => void }) {
	const { data: me } = useMe();
	const { data: address } = useAddress();
	const save = useSaveOnboarding();
	const { push } = useToast();
	const [form, setForm] = useState<FormState>({
		phone: me?.phone || "",
		address_line1: address?.address_line1 || "",
		address_line2: address?.address_line2 || "",
		city: address?.city || "",
		state: address?.state || "",
		pincode: address?.pincode || "",
	});

	const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
	const field =
		"w-full rounded-xl border border-ppf-border bg-ppf-input px-4 py-3 text-ppf-text outline-none focus:border-ppf-green focus:bg-white";
	const label = "mb-1 block text-sm font-medium text-ppf-text";

	const required: (keyof FormState)[] = ["phone", "address_line1", "city", "state", "pincode"];

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const missing = required.filter((k) => !form[k].trim());
		if (missing.length) {
			push("Please fill all required fields", "error");
			return;
		}
		try {
			await save.mutateAsync({ ...form });
			push("Saved");
			onDone?.();
		} catch (err) {
			push(frappeError(err, "Could not save"), "error");
		}
	}

	return (
		<form onSubmit={submit} className="space-y-3">
			<div>
				<label className={label}>Phone Number *</label>
				<input className={field} inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" />
			</div>
			<div>
				<label className={label}>Address Line 1 *</label>
				<input className={field} value={form.address_line1} onChange={(e) => set("address_line1", e.target.value)} placeholder="House / Flat, Street" />
			</div>
			<div>
				<label className={label}>Address Line 2</label>
				<input className={field} value={form.address_line2} onChange={(e) => set("address_line2", e.target.value)} placeholder="Area / Landmark (optional)" />
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className={label}>City *</label>
					<input className={field} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
				</div>
				<div>
					<label className={label}>State *</label>
					<input className={field} value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="State" />
				</div>
			</div>
			<div>
				<label className={label}>Pincode *</label>
				<input className={field} inputMode="numeric" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="560001" />
			</div>
			<button
				type="submit"
				disabled={save.isPending}
				className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-ppf-green py-4 text-lg font-bold text-white shadow-glow disabled:opacity-60"
			>
				{save.isPending ? <Spinner className="border-ppf-text/30 border-t-ppf-text" /> : ctaLabel}
			</button>
		</form>
	);
}
