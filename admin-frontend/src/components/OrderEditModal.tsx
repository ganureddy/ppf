import { useEffect, useMemo, useState } from "react";
import { getOrderDetail, useProducts, useUpdateOrder } from "@/api/hooks";
import { frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";
import { formatMoney } from "@/lib/format";
import type { OrderItem } from "@/lib/types";
import { CloseIcon, PlusIcon, TrashIcon } from "./icons";
import { Spinner } from "./EmptyState";

interface EditLine {
	docname?: string;
	item_code: string;
	item_name: string;
	uom: string;
	qty: string;
	rate: string;
}

export function OrderEditModal({
	orderName,
	onClose,
	onSaved,
}: {
	orderName: string;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { push } = useToast();
	const update = useUpdateOrder();
	const { data: products } = useProducts();
	const [loading, setLoading] = useState(true);
	const [currency, setCurrency] = useState("INR");
	const [deliveryDate, setDeliveryDate] = useState("");
	const [lines, setLines] = useState<EditLine[]>([]);
	const [addCode, setAddCode] = useState("");

	useEffect(() => {
		let active = true;
		(async () => {
			try {
				const d = await getOrderDetail(orderName);
				if (!active) return;
				setCurrency(d.currency || "INR");
				setDeliveryDate(d.delivery_date || "");
				setLines(
					d.items.map((it: OrderItem) => ({
						docname: it.docname,
						item_code: it.item_code,
						item_name: it.item_name,
						uom: it.uom,
						qty: String(it.qty),
						rate: String(it.rate),
					})),
				);
			} catch (e) {
				push(frappeError(e, "Could not load order"), "error");
				onClose();
			} finally {
				if (active) setLoading(false);
			}
		})();
		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [orderName]);

	const total = useMemo(
		() => lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0), 0),
		[lines],
	);

	function setLine(idx: number, k: keyof EditLine, v: string) {
		setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [k]: v } : l)));
	}

	function removeLine(idx: number) {
		setLines((ls) => ls.filter((_, i) => i !== idx));
	}

	function addItem() {
		if (!addCode) return;
		if (lines.some((l) => l.item_code === addCode)) {
			push("Item already in this order", "error");
			return;
		}
		const p = products?.find((x) => x.item_code === addCode);
		if (!p) return;
		setLines((ls) => [
			...ls,
			{ item_code: p.item_code, item_name: p.item_name, uom: p.uom, qty: "1", rate: String(p.rate ?? 0) },
		]);
		setAddCode("");
	}

	async function save() {
		const items = lines.map((l) => ({
			docname: l.docname,
			item_code: l.item_code,
			uom: l.uom,
			qty: parseFloat(l.qty) || 0,
			rate: parseFloat(l.rate) || 0,
		}));
		if (!items.some((i) => i.qty > 0)) {
			push("Add at least one item with quantity", "error");
			return;
		}
		try {
			await update.mutateAsync({ sales_order: orderName, items, delivery_date: deliveryDate || undefined });
			push("Order updated");
			onSaved();
			onClose();
		} catch (e) {
			push(frappeError(e, "Could not update order"), "error");
		}
	}

	const field = "w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-ppf-purple";

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
			<div className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-ppf-text">Edit Order · {orderName}</h2>
					<button onClick={onClose} aria-label="Close" className="text-ppf-subtext">
						<CloseIcon width={22} height={22} />
					</button>
				</div>

				{loading ? (
					<div className="flex justify-center py-10">
						<Spinner className="h-6 w-6" />
					</div>
				) : (
					<div className="space-y-4">
						<div>
							<label className="mb-1 block text-sm font-medium">Delivery Date</label>
							<input
								type="date"
								className={field}
								value={deliveryDate}
								onChange={(e) => setDeliveryDate(e.target.value)}
							/>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium">Items</label>
							<div className="space-y-2">
								{lines.map((l, idx) => (
									<div key={l.docname ?? l.item_code} className="rounded-lg border border-black/10 p-2.5">
										<div className="mb-2 flex items-center justify-between">
											<span className="text-sm font-semibold text-ppf-text">{l.item_name}</span>
											<button onClick={() => removeLine(idx)} aria-label="Remove" className="text-ppf-danger">
												<TrashIcon width={16} height={16} />
											</button>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className="mb-0.5 block text-[11px] text-ppf-subtext">Qty ({l.uom})</label>
												<input
													type="number"
													step="0.01"
													className={field}
													value={l.qty}
													onChange={(e) => setLine(idx, "qty", e.target.value)}
												/>
											</div>
											<div>
												<label className="mb-0.5 block text-[11px] text-ppf-subtext">Rate</label>
												<input
													type="number"
													step="0.01"
													className={field}
													value={l.rate}
													onChange={(e) => setLine(idx, "rate", e.target.value)}
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="flex items-center gap-2">
							<select className={field} value={addCode} onChange={(e) => setAddCode(e.target.value)}>
								<option value="">+ Add item…</option>
								{products
									?.filter((p) => !p.disabled && !lines.some((l) => l.item_code === p.item_code))
									.map((p) => (
										<option key={p.item_code} value={p.item_code}>
											{p.item_name} — {formatMoney(p.rate, currency)}
										</option>
									))}
							</select>
							<button
								onClick={addItem}
								disabled={!addCode}
								className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ppf-purple-light text-ppf-purple disabled:opacity-50"
								aria-label="Add"
							>
								<PlusIcon width={18} height={18} />
							</button>
						</div>

						<div className="flex items-center justify-between border-t border-ppf-border pt-3">
							<span className="text-sm text-ppf-subtext">Items total</span>
							<span className="font-semibold text-ppf-text">{formatMoney(total, currency)}</span>
						</div>

						<button
							onClick={save}
							disabled={update.isPending}
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-ppf-purple py-3 font-semibold text-white disabled:opacity-60"
						>
							{update.isPending ? <Spinner className="border-white/40 border-t-white" /> : "Save Changes"}
						</button>
						<p className="text-center text-[11px] text-ppf-muted">
							Already billed/delivered quantities are protected and may block some edits.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
