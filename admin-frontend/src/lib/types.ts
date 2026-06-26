export interface Me {
	user: string;
	name: string;
	full_name?: string;
}

export interface MonthCard {
	label: string;
	amount: number;
	delta: number;
}

export interface MonthlyBar {
	month: string;
	amount: number;
}

export interface Dashboard {
	currency: string;
	total_sales: number;
	total_collected: number;
	total_outstanding: number;
	month: string;
	month_cards: MonthCard[];
	monthly_sales: MonthlyBar[];
	customer_total: number;
	customer_pending: number;
}

export interface Order {
	name: string;
	customer: string;
	customer_name: string;
	transaction_date: string;
	delivery_date?: string;
	grand_total: number;
	status: string;
	currency: string;
	per_billed: number;
	per_delivered: number;
	payment_status?: string;
	paid?: number;
	pending?: number;
	credit_days?: number;
	fulfillment_status?: string;
}

export interface TallySettings {
	tally_enabled: boolean;
	base_url?: string;
	tally_company?: string;
	port?: string;
	api_key?: string;
	api_secret?: string;
	webhook_url?: string;
	sync_mode?: string;
	sync_frequency?: string;
	default_sales_ledger?: string;
	default_purchase_ledger?: string;
	default_party_ledger?: string;
	connection_status?: string;
	last_sync?: string;
}

export interface DeliveryConfig {
	enabled: boolean;
	amount: number;
	free_above: number;
}

export interface ProductSalesReport {
	from_date: string;
	to_date: string;
	currency: string;
	products: {
		item_name: string;
		total_qty: number;
		highest_qty: number;
		amount: number;
		top_customer: string;
	}[];
}

export interface MonthlyReport {
	currency: string;
	month: string;
	total_sales: number;
	order_count: number;
	top_customers: { customer_name: string; amount: number; orders: number }[];
	top_orders: { name: string; customer_name: string; amount: number }[];
	top_products: { item_name: string; qty: number; amount: number }[];
	all_orders: {
		name: string;
		customer_name: string;
		transaction_date: string;
		status: string;
		grand_total: number;
		paid: number;
		pending: number;
	}[];
}

export interface CustomerAddress {
	name?: string;
	address_line1?: string;
	address_line2?: string;
	city?: string;
	state?: string;
	pincode?: string;
	country?: string;
}

export interface AdminCustomer {
	name: string;
	customer_name: string;
	customer_group?: string;
	mobile_no?: string;
	credit_days: number;
	address?: CustomerAddress | null;
}

export interface ARCustomer {
	customer: string;
	customer_name: string;
	credit_days: number;
	orders: number;
	total: number;
	paid: number;
	outstanding: number;
	overdue: number;
}

export interface AROrder {
	name: string;
	customer_name: string;
	transaction_date: string;
	grand_total: number;
	paid: number;
	pending: number;
	payment_status: string;
	credit_days: number;
}

export interface Insights {
	currency: string;
	summary: {
		total_sales: number;
		total_collected: number;
		total_outstanding: number;
		overdue_amount: number;
		order_count: number;
		customers_with_dues: number;
	};
	monthly_sales: MonthlyBar[];
	top_customers: ARCustomer[];
	by_customer: ARCustomer[];
	by_order: AROrder[];
}

export interface OrdersResponse {
	orders: Order[];
	total: number;
	page: number;
}

export interface Shipment {
	name: string;
	customer: string;
	customer_name: string;
	posting_date: string;
	grand_total: number;
	status: string;
	currency: string;
}

export interface Product {
	item_code: string;
	item_name: string;
	item_group?: string;
	uom: string;
	rate: number;
	image?: string;
	disabled: number;
	published_stock?: number | null;
}

export interface ProductMeta {
	item_groups: string[];
	uoms: string[];
	price_list: string | null;
	currency: string;
}
