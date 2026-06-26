import frappe
from frappe import _

from ppf.api.utils import (
	get_current_customer,
	get_primary_address,
	require_login,
	upsert_primary_address,
)


@frappe.whitelist()
def get_address():
	"""Return the logged-in customer's primary address."""
	require_login()
	return get_primary_address(get_current_customer())


@frappe.whitelist(methods=["POST"])
def update_address(
	address_line1, address_line2=None, city=None, state=None, pincode=None, country=None
):
	"""Create/update the logged-in customer's primary address."""
	require_login()
	customer = get_current_customer()
	if not customer:
		frappe.throw(_("No customer is linked to your account. Please contact us."))
	upsert_primary_address(
		customer,
		{
			"address_line1": address_line1,
			"address_line2": address_line2,
			"city": city,
			"state": state,
			"pincode": pincode,
			"country": country,
		},
	)
	return get_primary_address(customer)


@frappe.whitelist(methods=["POST"])
def save_onboarding(phone, address_line1, city, state, pincode, address_line2=None, country=None):
	"""Save mandatory phone + address (used for first-time onboarding and updates)."""
	require_login()
	customer = get_current_customer()
	if not customer:
		frappe.throw(_("No customer is linked to your account. Please contact us."))

	phone = (phone or "").strip()
	missing = [
		label
		for label, val in [
			("Phone number", phone),
			("Address line 1", address_line1),
			("City", city),
			("State", state),
			("Pincode", pincode),
		]
		if not (val and str(val).strip())
	]
	if missing:
		frappe.throw(_("These fields are required: {0}").format(", ".join(missing)))

	# Phone -> Customer + linked Contact
	frappe.db.set_value("Customer", customer, "mobile_no", phone)
	contact = frappe.db.get_value("Contact", {"user": frappe.session.user}, "name")
	if contact:
		cdoc = frappe.get_doc("Contact", contact)
		cdoc.mobile_no = phone
		if not cdoc.get("phone_nos"):
			cdoc.append("phone_nos", {"phone": phone, "is_primary_mobile_no": 1})
		else:
			cdoc.phone_nos[0].phone = phone
		cdoc.flags.ignore_permissions = True
		cdoc.save(ignore_permissions=True)

	upsert_primary_address(
		customer,
		{
			"address_line1": address_line1,
			"address_line2": address_line2,
			"city": city,
			"state": state,
			"pincode": pincode,
			"country": country,
			"phone": phone,
		},
	)
	frappe.db.commit()  # nosemgrep
	return {"ok": True}


# Tracking timeline buckets.
ACCEPTED = ("To Deliver and Bill", "To Bill", "To Deliver", "Completed")


@frappe.whitelist()
def order_detail(sales_order):
	"""Order summary + items + payment info + a delivery tracking timeline."""
	require_login()
	customer = get_current_customer()
	so = frappe.db.get_value(
		"Sales Order",
		sales_order,
		[
			"name",
			"customer",
			"transaction_date",
			"delivery_date",
			"grand_total",
			"advance_paid",
			"status",
			"currency",
			"per_delivered",
			"per_billed",
			"custom_fulfillment_status",
		],
		as_dict=True,
	)
	if not so or (customer and so.customer != customer):
		frappe.throw(_("Order not found."))

	items = frappe.get_all(
		"Sales Order Item",
		filters={"parent": sales_order},
		fields=["item_name", "qty", "uom", "rate", "amount"],
		order_by="idx asc",
	)

	from ppf.api.payments import get_order_payment_info

	pay = get_order_payment_info(so)

	# Fulfillment is driven by the admin (Received → Processing → Dispatched → Delivered).
	flow = ["Received", "Processing", "Dispatched", "Delivered"]
	fs = so.custom_fulfillment_status or "Received"
	current = flow.index(fs) if fs in flow else 0
	if (so.per_delivered or 0) >= 100 or so.status == "Completed":
		current = 3  # fully delivered

	labels = [
		("Order Received", "We have received your order."),
		("Processing", "Your order is confirmed and being prepared."),
		("Dispatched", "Your order is on the way."),
		("Delivered", "Enjoy your fresh produce!"),
	]
	steps = [
		{"key": flow[i].lower(), "label": labels[i][0], "desc": labels[i][1], "done": i <= current}
		for i in range(4)
	]

	return {
		"name": so.name,
		"transaction_date": str(so.transaction_date),
		"delivery_date": str(so.delivery_date) if so.delivery_date else None,
		"grand_total": so.grand_total,
		"status": so.status,
		"currency": so.currency,
		"items": items,
		"payment_status": pay["payment_status"],
		"paid": pay["paid"],
		"pending": pay["pending"],
		"steps": steps,
		"current_step": current,
	}


@frappe.whitelist()
def account_summary():
	"""Customer-wide stats: orders, billed, paid, outstanding, overdue + monthly spend."""
	require_login()
	customer = get_current_customer()
	if not customer:
		return {
			"placed_orders": 0,
			"active_bills": 0,
			"closed_bills": 0,
			"total_billed": 0,
			"total_paid": 0,
			"outstanding": 0,
			"overdue": 0,
			"currency": "INR",
			"monthly_spend": [],
		}

	from frappe.utils import flt, get_first_day, get_last_day, getdate, nowdate

	from ppf.api.payments import get_order_payment_info

	currency = frappe.db.get_value("Customer", customer, "default_currency") or "INR"

	orders = frappe.get_all(
		"Sales Order",
		filters={"customer": customer, "docstatus": 1},
		fields=["name", "customer", "grand_total", "advance_paid", "transaction_date", "currency"],
		limit_page_length=2000,
	)
	total_billed = total_paid = outstanding = overdue = 0.0
	for o in orders:
		info = get_order_payment_info(o)
		total_billed += info["grand_total"]
		total_paid += info["paid"]
		outstanding += info["pending"]
		if info["payment_status"] == "Overdue":
			overdue += info["pending"]
		if o.currency:
			currency = o.currency

	active_bills = frappe.db.count(
		"Sales Invoice",
		{"customer": customer, "docstatus": 1, "status": ["in", ACTIVE_BILL_STATUSES]},
	)
	closed_bills = frappe.db.count(
		"Sales Invoice",
		{"customer": customer, "docstatus": 1, "status": ["in", CLOSED_BILL_STATUSES]},
	)

	# Monthly spend (paid) for the current year.
	abbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	year = getdate(nowdate()).year
	monthly = []
	for mo in range(1, 13):
		start = getdate(f"{year}-{mo:02d}-01")
		rows = frappe.get_all(
			"Sales Order",
			filters={
				"customer": customer,
				"docstatus": 1,
				"transaction_date": ["between", [start, get_last_day(start)]],
			},
			fields=["sum(grand_total) as total"],
		)
		monthly.append({"month": abbr[mo - 1], "amount": flt(rows[0].total) if rows and rows[0].total else 0})

	return {
		"placed_orders": len(orders),
		"active_bills": active_bills,
		"closed_bills": closed_bills,
		"total_billed": total_billed,
		"total_paid": total_paid,
		"outstanding": outstanding,
		"overdue": overdue,
		"currency": currency,
		"monthly_spend": monthly,
	}

# Map the PWA's status buckets onto ERPNext statuses.
ACTIVE_BILL_STATUSES = ("Unpaid", "Overdue", "Partly Paid")
CLOSED_BILL_STATUSES = ("Paid", "Return", "Credit Note Issued")
PLACED_ORDER_STATUSES = ("To Deliver and Bill", "To Bill", "To Deliver", "Draft")
ACCEPTED_ORDER_STATUSES = ("To Deliver and Bill", "To Deliver", "Completed")


@frappe.whitelist()
def bills(status=None):
	"""Return Sales Invoices for the logged-in customer.

	``status`` may be 'active' or 'closed' to filter buckets.
	"""
	require_login()
	customer = get_current_customer()
	if not customer:
		return []

	filters = {"customer": customer, "docstatus": 1}
	if status == "active":
		filters["status"] = ["in", ACTIVE_BILL_STATUSES]
	elif status == "closed":
		filters["status"] = ["in", CLOSED_BILL_STATUSES]

	return frappe.get_all(
		"Sales Invoice",
		filters=filters,
		fields=[
			"name",
			"posting_date",
			"due_date",
			"grand_total",
			"outstanding_amount",
			"status",
			"currency",
		],
		order_by="posting_date desc, creation desc",
		limit_page_length=100,
	)


@frappe.whitelist()
def orders(status=None):
	"""Return placed (submitted) Sales Orders for the logged-in customer."""
	require_login()
	customer = get_current_customer()
	if not customer:
		return []

	filters = {"customer": customer, "docstatus": 1}
	if status:
		filters["status"] = status

	rows = frappe.get_all(
		"Sales Order",
		filters=filters,
		fields=[
			"name",
			"customer",
			"transaction_date",
			"delivery_date",
			"grand_total",
			"advance_paid",
			"status",
			"currency",
		],
		order_by="transaction_date desc, creation desc",
		limit_page_length=100,
	)
	from ppf.api.payments import get_order_payment_info

	for r in rows:
		info = get_order_payment_info(r)
		r["payment_status"] = info["payment_status"]
		r["paid"] = info["paid"]
		r["pending"] = info["pending"]
	return rows


@frappe.whitelist()
def dashboard():
	"""Counts + last order for the customer Home screen (C4)."""
	require_login()
	customer = get_current_customer()
	if not customer:
		return {
			"placed_orders": 0,
			"accepted_orders": 0,
			"active_bills": 0,
			"closed_bills": 0,
			"last_order": None,
		}

	placed = frappe.db.count("Sales Order", {"customer": customer, "docstatus": 1})
	accepted = frappe.db.count(
		"Sales Order",
		{"customer": customer, "docstatus": 1, "status": ["in", ACCEPTED_ORDER_STATUSES]},
	)
	active_bills = frappe.db.count(
		"Sales Invoice",
		{"customer": customer, "docstatus": 1, "status": ["in", ACTIVE_BILL_STATUSES]},
	)
	closed_bills = frappe.db.count(
		"Sales Invoice",
		{"customer": customer, "docstatus": 1, "status": ["in", CLOSED_BILL_STATUSES]},
	)

	last_order = frappe.get_all(
		"Sales Order",
		filters={"customer": customer, "docstatus": 1},
		fields=["name", "transaction_date", "delivery_date", "grand_total", "status", "currency"],
		order_by="transaction_date desc, creation desc",
		limit_page_length=1,
	)

	return {
		"placed_orders": placed,
		"accepted_orders": accepted,
		"active_bills": active_bills,
		"closed_bills": closed_bills,
		"last_order": last_order[0] if last_order else None,
	}
