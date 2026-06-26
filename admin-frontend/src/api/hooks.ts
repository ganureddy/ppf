import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { call } from "@/lib/api";
import type {
	AdminCustomer,
	Dashboard,
	DeliveryConfig,
	Insights,
	Me,
	MonthlyReport,
	Order,
	OrdersResponse,
	Product,
	ProductMeta,
	ProductSalesReport,
	Shipment,
	TallySettings,
} from "@/lib/types";

export function useMe() {
	return useQuery({
		queryKey: ["me"],
		queryFn: () => call<Me>("ppf.api.auth.me"),
		retry: false,
		staleTime: 5 * 60 * 1000,
	});
}

export function useDashboard(month?: string) {
	return useQuery({
		queryKey: ["dashboard", month ?? "current"],
		queryFn: () => call<Dashboard>("ppf.api.admin.dashboard", month ? { month } : undefined),
	});
}

export function useInsights() {
	return useQuery({
		queryKey: ["insights"],
		queryFn: () => call<Insights>("ppf.api.admin.insights"),
	});
}

export function useOrders(q: string, page = 1) {
	return useQuery({
		queryKey: ["admin-orders", q, page],
		queryFn: () => call<OrdersResponse>("ppf.api.admin.orders", { q, page }),
	});
}

export function useChangeDeliveryDay() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ sales_order, date }: { sales_order: string; date: string }) =>
			call("ppf.api.admin.change_delivery_day", { sales_order, date }, "POST"),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
	});
}

export function useBillNow() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (sales_order: string) =>
			call<{ sales_invoice: string; submitted: boolean; warning?: string }>(
				"ppf.api.admin.bill_now",
				{ sales_order },
				"POST",
			),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["admin-orders"] });
			qc.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});
}

export function useSetFulfillment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ sales_order, status }: { sales_order: string; status: string }) =>
			call<{ fulfillment_status: string }>("ppf.api.admin.set_fulfillment", { sales_order, status }, "POST"),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
	});
}

export function useMonthlyReport() {
	return useQuery({
		queryKey: ["monthly-report"],
		queryFn: () => call<MonthlyReport>("ppf.api.admin.monthly_report"),
	});
}

export async function getMonthlyReportPdf() {
	return call<{ url: string }>("ppf.api.admin.monthly_report_pdf");
}

export function useSettings() {
	return useQuery({
		queryKey: ["admin-settings"],
		queryFn: () => call<DeliveryConfig>("ppf.api.admin.get_settings"),
	});
}

export function useUpdateSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => call("ppf.api.admin.update_settings", data, "POST"),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-settings"] }),
	});
}

export function useTallySettings() {
	return useQuery({
		queryKey: ["tally-settings"],
		queryFn: () => call<TallySettings>("ppf.api.admin.get_tally_settings"),
	});
}

export function useUpdateTallySettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			call("ppf.api.admin.update_tally_settings", data, "POST"),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["tally-settings"] }),
	});
}

export function useProductSalesReport(from_date: string, to_date: string) {
	return useQuery({
		queryKey: ["product-sales", from_date, to_date],
		queryFn: () => call<ProductSalesReport>("ppf.api.admin.product_sales_report", { from_date, to_date }),
	});
}

export async function getOrderPdfUrl(sales_order: string) {
	return call<{ url: string }>("ppf.api.admin.order_pdf", { sales_order });
}

export function useMarkPaid() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (sales_order: string) =>
			call<{ payment_status: string; pending: number }>("ppf.api.admin.mark_paid", { sales_order }, "POST"),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["admin-orders"] });
			qc.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});
}

export function useCustomers(q: string) {
	return useQuery({
		queryKey: ["admin-customers", q],
		queryFn: () => call<AdminCustomer[]>("ppf.api.admin.list_customers", q ? { q } : undefined),
	});
}

export function useSetCreditDays() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ customer, days }: { customer: string; days: number }) =>
			call("ppf.api.admin.set_credit_days", { customer, days }, "POST"),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-customers"] }),
	});
}

export function useUpdateCustomer() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			call("ppf.api.admin.update_customer", data, "POST"),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-customers"] }),
	});
}

export function useDispatch() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (sales_order: string) =>
			call<{ delivery_note: string; submitted: boolean; warning?: string }>(
				"ppf.api.admin.dispatch",
				{ sales_order },
				"POST",
			),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shipment"] }),
	});
}

export function useProducts() {
	return useQuery({
		queryKey: ["admin-products"],
		queryFn: () => call<Product[]>("ppf.api.admin.list_products"),
	});
}

export function useProductMeta() {
	return useQuery({
		queryKey: ["product-meta"],
		queryFn: () => call<ProductMeta>("ppf.api.admin.meta"),
		staleTime: 10 * 60 * 1000,
	});
}

export function useSaveProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (payload: Record<string, unknown>) =>
			call<{ item_code: string }>("ppf.api.admin.save_product", payload, "POST"),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
	});
}

export async function fetchShipmentPending(bill_date?: string) {
	return call<{ orders: Order[]; total: number }>(
		"ppf.api.admin.shipment_pending",
		bill_date ? { bill_date } : undefined,
	);
}

export async function fetchShipmentCompleted(shipped_date?: string) {
	return call<{ shipments: Shipment[]; total: number }>(
		"ppf.api.admin.shipment_completed",
		shipped_date ? { shipped_date } : undefined,
	);
}
