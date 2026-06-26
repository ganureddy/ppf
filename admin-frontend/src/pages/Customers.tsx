import { useState } from "react";
import { useCustomers, useUpdateCustomer } from "@/api/hooks";
import { CardSkeleton, EmptyState, Spinner } from "@/components/EmptyState";
import { SearchIcon } from "@/components/icons";
import { frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";
import type { AdminCustomer } from "@/lib/types";

function CustomerCard({ c }: { c: AdminCustomer }) {
	const update = useUpdateCustomer();
	const { push } = useToast();
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState({
		mobile_no: c.mobile_no || "",
		credit_days: String(c.credit_days ?? 0),
		address_line1: c.address?.address_line1 || "",
		address_line2: c.address?.address_line2 || "",
		city: c.address?.city || "",
		state: c.address?.state || "",
		pincode: c.address?.pincode || "",
	});

	const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
	const field = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-ppf-purple";

	async function save() {
		try {
			await update.mutateAsync({
				customer: c.name,
				mobile_no: form.mobile_no,
				credit_days: parseInt(form.credit_days || "0", 10),
				address_line1: form.address_line1 || undefined,
				address_line2: form.address_line2 || undefined,
				city: form.city || undefined,
				state: form.state || undefined,
				pincode: form.pincode || undefined,
			});
			push(`${c.customer_name} updated`);
			setOpen(false);
		} catch (e) {
			push(frappeError(e, "Could not update customer"), "error");
		}
	}

	return (
		<div className="rounded-card bg-white p-4 shadow-card">
			<button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
				<div>
					<p className="font-semibold text-ppf-text">{c.customer_name}</p>
					<p className="text-xs text-ppf-subtext">
						{c.mobile_no || "No mobile"} · {c.credit_days}d credit
					</p>
				</div>
				<span className="text-sm font-semibold text-ppf-purple">{open ? "Close" : "Edit"}</span>
			</button>

			{open && (
				<div className="mt-3 space-y-2">
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="mb-1 block text-xs text-ppf-subtext">Mobile</label>
							<input className={field} value={form.mobile_no} onChange={(e) => set("mobile_no", e.target.value)} placeholder="9876543210" />
						</div>
						<div>
							<label className="mb-1 block text-xs text-ppf-subtext">Credit days</label>
							<input className={field} type="number" min={0} value={form.credit_days} onChange={(e) => set("credit_days", e.target.value)} />
						</div>
					</div>
					<label className="mb-1 block text-xs text-ppf-subtext">Address</label>
					<input className={field} placeholder="Address line 1" value={form.address_line1} onChange={(e) => set("address_line1", e.target.value)} />
					<input className={field} placeholder="Address line 2" value={form.address_line2} onChange={(e) => set("address_line2", e.target.value)} />
					<div className="grid grid-cols-3 gap-2">
						<input className={field} placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
						<input className={field} placeholder="State" value={form.state} onChange={(e) => set("state", e.target.value)} />
						<input className={field} placeholder="Pincode" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
					</div>
					<button onClick={save} disabled={update.isPending} className="mt-1 flex w-full items-center justify-center rounded-lg bg-ppf-purple py-2.5 text-sm font-semibold text-white disabled:opacity-60">
						{update.isPending ? <Spinner className="border-white/40 border-t-white" /> : "Save"}
					</button>
				</div>
			)}
		</div>
	);
}

export default function Customers() {
	const [q, setQ] = useState("");
	const { data, isLoading } = useCustomers(q);

	return (
		<div className="p-3">
			<div className="relative mb-3">
				<SearchIcon width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ppf-subtext" />
				<input
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Search customer"
					className="w-full rounded-full border border-black/5 bg-white py-3 pl-10 pr-4 shadow-card outline-none focus:border-ppf-purple"
				/>
			</div>
			{isLoading ? (
				<CardSkeleton />
			) : !data || data.length === 0 ? (
				<EmptyState caption="No customers found" />
			) : (
				<div className="space-y-3 pb-4">
					{data.map((c) => (
						<CustomerCard key={c.name} c={c} />
					))}
				</div>
			)}
		</div>
	);
}
