import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateOrder, useCustomers, useProducts } from "@/api/hooks";
import { CardSkeleton, EmptyState, Spinner } from "@/components/EmptyState";
import { SearchIcon } from "@/components/icons";
import { frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";
import { formatMoney, todayISO } from "@/lib/format";

export default function CreateOrder() {
	const navigate = useNavigate();
	const { push } = useToast();
	const create = useCreateOrder();

	const [custQ, setCustQ] = useState("");
	const { data: customers, isLoading: loadingCust } = useCustomers(custQ);
	const { data: products, isLoading: loadingProd } = useProducts();

	const [customer, setCustomer] = useState<{ name: string; label: string } | null>(null);
	const [deliveryDate, setDeliveryDate] = useState(todayISO());
	const [qtys, setQtys] = useState<Record<string, number>>({});
	const [prodQ, setProdQ] = useState("");

	const currency = "INR";

	const visibleProducts = useMemo(
		() =>
			(products ?? [])
				.filter((p) => !p.disabled)
				.filter((p) => p.item_name.toLowerCase().includes(prodQ.toLowerCase())),
		[products, prodQ],
	);

	const lines = useMemo(
		() =>
			Object.entries(qtys)
				.filter(([, q]) => q > 0)
				.map(([code, q]) => {
					const p = products?.find((x) => x.item_code === code);
					return { code, name: p?.item_name ?? code, qty: q, rate: p?.rate ?? 0 };
				}),
		[qtys, products],
	);

	const total = lines.reduce((s, l) => s + l.qty * l.rate, 0);

	function setQty(code: string, q: number) {
		setQtys((m) => ({ ...m, [code]: Math.max(0, q) }));
	}

	async function submit() {
		if (!customer) {
			push("Please select a customer", "error");
			return;
		}
		const items = lines.map((l) => ({ item_code: l.code, qty: l.qty }));
		if (!items.length) {
			push("Add at least one item", "error");
			return;
		}
		try {
			const res = await create.mutateAsync({ customer: customer.name, items, delivery_date: deliveryDate });
			push(`Order ${res.sales_order} created`);
			navigate("/orders");
		} catch (e) {
			push(frappeError(e, "Could not create order"), "error");
		}
	}

	const field = "w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-ppf-purple";

	return (
		<div className="p-3 pb-28">
			<h2 className="mb-3 font-semibold text-ppf-text">Create Order</h2>

			<div className="rounded-card bg-white p-4 shadow-card">
				<label className="mb-1 block text-sm font-medium">Customer</label>
				{customer ? (
					<div className="flex items-center justify-between rounded-lg bg-ppf-purple-light px-3 py-2.5">
						<span className="text-sm font-semibold text-ppf-purple">{customer.label}</span>
						<button onClick={() => setCustomer(null)} className="text-xs font-semibold text-ppf-purple">
							Change
						</button>
					</div>
				) : (
					<>
						<div className="relative">
							<SearchIcon width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ppf-subtext" />
							<input
								value={custQ}
								onChange={(e) => setCustQ(e.target.value)}
								placeholder="Search customer"
								className="w-full rounded-lg border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ppf-purple"
							/>
						</div>
						<div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-black/5">
							{loadingCust ? (
								<p className="p-3 text-sm text-ppf-subtext">Loading…</p>
							) : !customers || customers.length === 0 ? (
								<p className="p-3 text-sm text-ppf-subtext">No customers</p>
							) : (
								customers.map((c) => (
									<button
										key={c.name}
										onClick={() => setCustomer({ name: c.name, label: c.customer_name })}
										className="flex w-full items-center justify-between border-b border-black/5 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-ppf-bg"
									>
										<span className="font-medium text-ppf-text">{c.customer_name}</span>
										<span className="text-xs text-ppf-subtext">{c.mobile_no || ""}</span>
									</button>
								))
							)}
						</div>
					</>
				)}

				<label className="mb-1 mt-4 block text-sm font-medium">Delivery Date</label>
				<input type="date" className={field} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
			</div>

			<div className="mt-3 flex items-center justify-between">
				<h3 className="font-semibold text-ppf-text">Items</h3>
			</div>
			<div className="relative my-2">
				<SearchIcon width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ppf-subtext" />
				<input
					value={prodQ}
					onChange={(e) => setProdQ(e.target.value)}
					placeholder="Search products"
					className="w-full rounded-full border border-black/5 bg-white py-2.5 pl-10 pr-4 text-sm shadow-card outline-none focus:border-ppf-purple"
				/>
			</div>

			{loadingProd ? (
				<CardSkeleton />
			) : visibleProducts.length === 0 ? (
				<EmptyState caption="No products" />
			) : (
				<div className="space-y-2">
					{visibleProducts.map((p) => {
						const q = qtys[p.item_code] ?? 0;
						return (
							<div key={p.item_code} className="flex items-center justify-between gap-2 rounded-card bg-white p-3 shadow-card">
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-ppf-text">{p.item_name}</p>
									<p className="text-xs text-ppf-subtext">
										{formatMoney(p.rate, currency)} / {p.uom}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setQty(p.item_code, q - 1)}
										className="h-8 w-8 rounded-lg bg-ppf-bg text-lg font-bold text-ppf-purple"
									>
										−
									</button>
									<input
										type="number"
										value={q || ""}
										onChange={(e) => setQty(p.item_code, parseFloat(e.target.value) || 0)}
										placeholder="0"
										className="w-12 rounded-lg border border-black/10 px-1 py-1.5 text-center text-sm outline-none focus:border-ppf-purple"
									/>
									<button
										onClick={() => setQty(p.item_code, q + 1)}
										className="h-8 w-8 rounded-lg bg-ppf-purple text-lg font-bold text-white"
									>
										+
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<div className="fixed inset-x-0 bottom-[58px] z-30 mx-auto max-w-[520px] border-t border-black/5 bg-white p-3">
				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-ppf-subtext">
						{lines.length} item{lines.length === 1 ? "" : "s"}
					</span>
					<span className="font-semibold text-ppf-text">{formatMoney(total, currency)}</span>
				</div>
				<button
					onClick={submit}
					disabled={create.isPending}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-ppf-purple py-3 font-semibold text-white disabled:opacity-60"
				>
					{create.isPending ? <Spinner className="border-white/40 border-t-white" /> : "Create Order"}
				</button>
			</div>
		</div>
	);
}
