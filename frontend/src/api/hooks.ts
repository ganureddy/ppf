import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { call, frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";
import type {
	AccountSummary,
	Address,
	Bill,
	Cart,
	Dashboard,
	DeliveryConfig,
	Me,
	Order,
	OrderDetail,
	Product,
} from "@/lib/types";

export function useMe() {
	return useQuery({
		queryKey: ["me"],
		queryFn: () => call<Me>("ppf.api.auth.me"),
		retry: false,
		staleTime: 5 * 60 * 1000,
	});
}

export function useProducts(search: string) {
	return useQuery({
		queryKey: ["products"],
		queryFn: () => call<Product[]>("ppf.api.catalog.list_products"),
		staleTime: 60 * 1000,
		select: (data) =>
			search.trim()
				? data.filter((p) =>
						p.item_name.toLowerCase().includes(search.trim().toLowerCase()),
					)
				: data,
	});
}

export function useDeliveryConfig() {
	return useQuery({
		queryKey: ["delivery-config"],
		queryFn: () => call<DeliveryConfig>("ppf.api.settings.delivery_config"),
		staleTime: 60 * 1000,
	});
}

export function useCart() {
	return useQuery({
		queryKey: ["cart"],
		queryFn: () => call<Cart>("ppf.api.cart.get"),
		staleTime: 10 * 1000,
	});
}

export function useSetCartItem() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ item_code, qty }: { item_code: string; qty: number }) =>
			call<Cart>("ppf.api.cart.set_item", { item_code, qty }, "POST"),
		onSuccess: (cart) => qc.setQueryData(["cart"], cart),
		onError: (e) => useToast.getState().push(frappeError(e, "Could not update cart"), "error"),
	});
}

export function useCheckout() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => call<{ sales_order: string }>("ppf.api.cart.checkout", {}, "POST"),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["cart"] });
			qc.invalidateQueries({ queryKey: ["orders"] });
			qc.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});
}

export function useAddress() {
	return useQuery({
		queryKey: ["address"],
		queryFn: () => call<Address | null>("ppf.api.customer.get_address"),
	});
}

export function useUpdateAddress() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Address) =>
			call<Address>("ppf.api.customer.update_address", data as Record<string, unknown>, "POST"),
		onSuccess: (a) => qc.setQueryData(["address"], a),
	});
}

export function useSaveOnboarding() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			call("ppf.api.customer.save_onboarding", data, "POST"),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["me"] });
			qc.invalidateQueries({ queryKey: ["address"] });
		},
	});
}

export function useOrderDetail(name: string) {
	return useQuery({
		queryKey: ["order-detail", name],
		queryFn: () => call<OrderDetail>("ppf.api.customer.order_detail", { sales_order: name }),
		enabled: !!name,
	});
}

export function useAccountSummary() {
	return useQuery({
		queryKey: ["account-summary"],
		queryFn: () => call<AccountSummary>("ppf.api.customer.account_summary"),
	});
}

export function useBills(status?: string) {
	return useQuery({
		queryKey: ["bills", status ?? "all"],
		queryFn: () => call<Bill[]>("ppf.api.customer.bills", status ? { status } : undefined),
	});
}

export function useOrders(status?: string) {
	return useQuery({
		queryKey: ["orders", status ?? "all"],
		queryFn: () => call<Order[]>("ppf.api.customer.orders", status ? { status } : undefined),
	});
}

export function useDashboard() {
	return useQuery({
		queryKey: ["dashboard"],
		queryFn: () => call<Dashboard>("ppf.api.customer.dashboard"),
	});
}
