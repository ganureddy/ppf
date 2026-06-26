export interface Me {
	user: string;
	name: string;
	full_name?: string;
	username?: string;
	email: string;
	phone?: string;
	user_image?: string;
	customer?: string;
	customer_name?: string;
	has_address?: boolean;
	onboarded?: boolean;
}

export interface TrackStep {
	key: string;
	label: string;
	desc: string;
	done: boolean;
}

export interface OrderDetail {
	name: string;
	transaction_date: string;
	delivery_date?: string;
	grand_total: number;
	status: string;
	currency: string;
	items: { item_name: string; qty: number; uom: string; rate: number; amount: number }[];
	payment_status: string;
	paid: number;
	pending: number;
	steps: TrackStep[];
	current_step: number;
}

export interface AccountSummary {
	placed_orders: number;
	active_bills: number;
	closed_bills: number;
	total_billed: number;
	total_paid: number;
	outstanding: number;
	overdue: number;
	currency: string;
	monthly_spend: { month: string; amount: number }[];
}

export interface Product {
	item_code: string;
	item_name: string;
	item_group?: string;
	uom: string;
	rate: number;
	currency: string;
	image?: string;
	published_stock?: number | null;
}

export interface CartItem {
	item_code: string;
	item_name: string;
	qty: number;
	uom: string;
	rate: number;
	amount: number;
}

export interface Cart {
	name: string | null;
	items: CartItem[];
	item_count: number;
	total: number;
	currency: string | null;
}

export interface Bill {
	name: string;
	posting_date: string;
	due_date?: string;
	grand_total: number;
	outstanding_amount: number;
	status: string;
	currency: string;
}

export interface Order {
	name: string;
	transaction_date: string;
	delivery_date?: string;
	grand_total: number;
	status: string;
	currency: string;
	payment_status?: string;
	paid?: number;
	pending?: number;
}

export interface DeliveryConfig {
	enabled: boolean;
	amount: number;
	free_above: number;
}

export interface Address {
	name?: string;
	address_line1?: string;
	address_line2?: string;
	city?: string;
	state?: string;
	pincode?: string;
	country?: string;
}

export interface Dashboard {
	placed_orders: number;
	accepted_orders: number;
	active_bills: number;
	closed_bills: number;
	last_order: Order | null;
}
