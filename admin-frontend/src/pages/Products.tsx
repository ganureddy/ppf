import { useState } from "react";
import { useProductMeta, useProducts, useSaveProduct } from "@/api/hooks";
import { CardSkeleton, EmptyState, Spinner } from "@/components/EmptyState";
import { CloseIcon, EditIcon, PlusIcon } from "@/components/icons";
import { frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

interface FormState {
	item_code?: string;
	item_name: string;
	item_group: string;
	uom: string;
	rate: string;
	published_stock: string;
	image: string;
	disabled: boolean;
}

const empty: FormState = {
	item_name: "",
	item_group: "",
	uom: "",
	rate: "",
	published_stock: "",
	image: "",
	disabled: false,
};

function ProductForm({ initial, onClose }: { initial: FormState; onClose: () => void }) {
	const { data: meta } = useProductMeta();
	const save = useSaveProduct();
	const { push } = useToast();
	const [form, setForm] = useState<FormState>(initial);
	const isEdit = !!initial.item_code;

	const set = (k: keyof FormState, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!form.item_name || !form.rate || !form.uom) {
			push("Name, rate and UOM are required", "error");
			return;
		}
		try {
			await save.mutateAsync({
				item_code: form.item_code,
				item_name: form.item_name,
				item_group: form.item_group || (meta?.item_groups[0] ?? ""),
				uom: form.uom,
				rate: form.rate,
				published_stock: form.published_stock === "" ? undefined : form.published_stock,
				image: form.image || undefined,
				disabled: form.disabled ? 1 : 0,
			});
			push(isEdit ? "Product updated" : "Product created");
			onClose();
		} catch (err) {
			push(frappeError(err, "Could not save product"), "error");
		}
	}

	const field = "w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-ppf-purple";

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
			<div className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-ppf-text">{isEdit ? "Edit Product" : "Add Product"}</h2>
					<button onClick={onClose} aria-label="Close" className="text-ppf-subtext">
						<CloseIcon width={22} height={22} />
					</button>
				</div>

				<form onSubmit={submit} className="space-y-3">
					<div>
						<label className="mb-1 block text-sm font-medium">Product Name</label>
						<input className={field} value={form.item_name} onChange={(e) => set("item_name", e.target.value)} placeholder="e.g. Cherry Tomato" />
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="mb-1 block text-sm font-medium">Rate (₹)</label>
							<input className={field} type="number" step="0.01" value={form.rate} onChange={(e) => set("rate", e.target.value)} placeholder="0.00" />
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium">UOM</label>
							<input className={field} list="uom-list" value={form.uom} onChange={(e) => set("uom", e.target.value)} placeholder="1 EA / 100 gm / 1 Kg" />
							<datalist id="uom-list">
								{meta?.uoms.map((u) => (
									<option key={u} value={u} />
								))}
							</datalist>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="mb-1 block text-sm font-medium">Item Group</label>
							<select className={field} value={form.item_group} onChange={(e) => set("item_group", e.target.value)}>
								<option value="">Default</option>
								{meta?.item_groups.map((g) => (
									<option key={g} value={g}>
										{g}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium">Published Stock</label>
							<input className={field} type="number" step="0.01" value={form.published_stock} onChange={(e) => set("published_stock", e.target.value)} placeholder="optional" />
						</div>
					</div>

					<div>
						<label className="mb-1 block text-sm font-medium">Image URL (optional)</label>
						<input className={field} value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="/files/... or https://..." />
					</div>

					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={form.disabled} onChange={(e) => set("disabled", e.target.checked)} />
						Disabled (hidden from customers)
					</label>

					<button type="submit" disabled={save.isPending} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-ppf-purple py-3 font-semibold text-white disabled:opacity-60">
						{save.isPending ? <Spinner className="border-white/40 border-t-white" /> : isEdit ? "Save Changes" : "Create Product"}
					</button>
				</form>
			</div>
		</div>
	);
}

export default function Products() {
	const { data, isLoading } = useProducts();
	const [form, setForm] = useState<FormState | null>(null);

	function openEdit(p: Product) {
		setForm({
			item_code: p.item_code,
			item_name: p.item_name,
			item_group: p.item_group ?? "",
			uom: p.uom,
			rate: String(p.rate ?? ""),
			published_stock: p.published_stock == null ? "" : String(p.published_stock),
			image: p.image ?? "",
			disabled: !!p.disabled,
		});
	}

	return (
		<div className="p-3">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="font-semibold text-ppf-text">Products</h2>
				<button onClick={() => setForm({ ...empty })} className="flex items-center gap-1 rounded-full bg-ppf-purple px-4 py-2 text-sm font-semibold text-white">
					<PlusIcon width={18} height={18} /> Add
				</button>
			</div>

			{isLoading ? (
				<CardSkeleton />
			) : !data || data.length === 0 ? (
				<EmptyState caption="No products yet — tap Add to create one" />
			) : (
				<div className="space-y-3 pb-4">
					{data.map((p) => (
						<div key={p.item_code} className="flex items-center justify-between gap-3 rounded-card bg-white p-4 shadow-card">
							<div className="flex min-w-0 items-center gap-3">
								{p.image ? (
									<img src={p.image} alt="" className="h-11 w-11 rounded-lg object-cover" />
								) : (
									<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ppf-purple-light text-xs font-bold text-ppf-purple">
										{p.item_name.charAt(0)}
									</div>
								)}
								<div className="min-w-0">
									<p className="truncate font-semibold text-ppf-text">
										{p.item_name}
										{p.disabled ? <span className="ml-2 text-xs text-ppf-danger">(disabled)</span> : null}
									</p>
									<p className="text-sm text-ppf-subtext">
										{formatMoney(p.rate)} for {p.uom}
										{p.published_stock != null ? ` · stock ${p.published_stock}` : ""}
									</p>
								</div>
							</div>
							<button onClick={() => openEdit(p)} className="rounded-lg bg-ppf-purple-light p-2 text-ppf-purple" aria-label="Edit">
								<EditIcon width={18} height={18} />
							</button>
						</div>
					))}
				</div>
			)}

			{form && <ProductForm initial={form} onClose={() => setForm(null)} />}
		</div>
	);
}
