import frappe
from frappe import _
from frappe.utils import add_days, add_months, flt, get_first_day, get_last_day, getdate, nowdate

from ppf.api.utils import (
	get_default_currency,
	get_default_selling_price_list,
	require_login,
)

MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# Products in this store only ever belong to one of these two groups.
SELLABLE_ITEM_GROUPS = ["Fruits", "Vegetables"]


def _require_admin():
	require_login()
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required."), frappe.AuthenticationError)


def _ensure_item_group(name):
	"""Make sure an Item Group exists (created as a leaf under the root group)."""
	if frappe.db.exists("Item Group", name):
		return name
	parent = (
		"All Item Groups"
		if frappe.db.exists("Item Group", "All Item Groups")
		else frappe.db.get_value("Item Group", {"is_group": 1}, "name")
	)
	doc = frappe.new_doc("Item Group")
	doc.item_group_name = name
	doc.is_group = 0
	if parent:
		doc.parent_item_group = parent
	doc.flags.ignore_permissions = True
	doc.insert(ignore_permissions=True)
	return name


# ---------------------------------------------------------------------------
# Analytics (A1)
# ---------------------------------------------------------------------------
def _sales_total(start, end):
	rows = frappe.get_all(
		"Sales Invoice",
		filters={"docstatus": 1, "posting_date": ["between", [start, end]]},
		fields=["sum(grand_total) as total"],
	)
	return flt(rows[0].total) if rows and rows[0].total else 0.0


@frappe.whitelist()
def dashboard(month=None):
	"""Analytics payload for the admin home screen (A1)."""
	_require_admin()
	currency = get_default_currency()
	ref = getdate(month + "-01") if month else getdate(nowdate())

	# Sales / Collected / Outstanding across submitted Sales Orders (live).
	from ppf.api.payments import get_order_payment_info

	so_rows = frappe.get_all(
		"Sales Order",
		filters={"docstatus": 1},
		fields=["name", "customer", "grand_total", "advance_paid", "transaction_date"],
		limit_page_length=5000,
	)
	total_sales = total_collected = total_outstanding = 0.0
	for r in so_rows:
		info = get_order_payment_info(r)
		total_sales += info["grand_total"]
		total_collected += info["paid"]
		total_outstanding += info["pending"]

	# Three month summary cards (ref month and the two before it).
	month_cards = []
	for i in (2, 1, 0):
		m = add_months(ref, -i)
		start, end = get_first_day(m), get_last_day(m)
		amount = _sales_total(start, end)
		prev = add_months(m, -1)
		prev_amount = _sales_total(get_first_day(prev), get_last_day(prev))
		if prev_amount:
			delta = round((amount - prev_amount) / prev_amount * 100)
		else:
			delta = 100 if amount else 0
		month_cards.append(
			{"label": f"{MONTH_ABBR[getdate(m).month - 1]} {getdate(m).year}", "amount": amount, "delta": delta}
		)

	# Monthly bars Jan..current month of the reference year.
	year = getdate(ref).year
	monthly = []
	for mo in range(1, 13):
		start = getdate(f"{year}-{mo:02d}-01")
		monthly.append({"month": MONTH_ABBR[mo - 1], "amount": _sales_total(start, get_last_day(start))})

	# Customer pending.
	total_customers = frappe.db.count("Customer", {"disabled": 0})
	pending_rows = frappe.get_all(
		"Sales Invoice",
		filters={"docstatus": 1, "outstanding_amount": [">", 0]},
		fields=["distinct customer as customer"],
	)
	pending_customers = len(pending_rows)

	# Payment-pending = number of submitted Sales Invoices still owing money (A1 card).
	pending_invoices = frappe.db.count(
		"Sales Invoice", {"docstatus": 1, "outstanding_amount": [">", 0]}
	)

	return {
		"currency": currency,
		"total_sales": total_sales,
		"total_collected": total_collected,
		"total_outstanding": total_outstanding,
		"month": f"{MONTH_ABBR[getdate(ref).month - 1]} {getdate(ref).year}",
		"month_cards": month_cards,
		"monthly_sales": monthly,
		"customer_total": total_customers,
		"customer_pending": pending_customers,
		"pending_invoices": pending_invoices,
	}


# ---------------------------------------------------------------------------
# Orders (A2 / A4)
# ---------------------------------------------------------------------------
def _order_fields():
	return [
		"name",
		"customer",
		"customer_name",
		"transaction_date",
		"delivery_date",
		"grand_total",
		"advance_paid",
		"status",
		"currency",
		"per_billed",
		"per_delivered",
		"custom_fulfillment_status",
	]


def _attach_payment_info(rows):
	from ppf.api.payments import get_order_payment_info

	for r in rows:
		info = get_order_payment_info(r)
		r["payment_status"] = info["payment_status"]
		r["paid"] = info["paid"]
		r["pending"] = info["pending"]
		r["credit_days"] = info["credit_days"]
		r["fulfillment_status"] = r.get("custom_fulfillment_status") or "Received"
	return rows


FULFILLMENT_FLOW = ["Received", "Processing", "Dispatched", "Delivered"]


@frappe.whitelist(methods=["POST"])
def set_fulfillment(sales_order, status):
	"""Advance an order's fulfillment status (Received → Processing → Dispatched → Delivered)."""
	_require_admin()
	if status not in FULFILLMENT_FLOW:
		frappe.throw(_("Invalid status."))
	if not frappe.db.exists("Sales Order", sales_order):
		frappe.throw(_("Order not found."))
	frappe.db.set_value("Sales Order", sales_order, "custom_fulfillment_status", status)
	frappe.db.commit()  # nosemgrep
	return {"sales_order": sales_order, "fulfillment_status": status}


@frappe.whitelist()
def order_pdf(sales_order):
	"""Generate (or refresh) the branded HTML invoice PDF and return its public URL."""
	_require_admin()
	from frappe.utils import get_url

	so = frappe.get_doc("Sales Order", sales_order)
	cust = frappe.get_doc("Customer", so.customer)
	from ppf.api.notifications import _save_public_pdf, order_pdf_html

	_save_public_pdf(order_pdf_html(so, cust), f"Order-{so.name}.pdf", "Sales Order", so.name)
	return {"url": get_url(f"/files/Order-{so.name}.pdf")}


@frappe.whitelist()
def orders(q=None, page=1, page_length=20):
	"""Paged submitted Sales Orders for admin (A2/A4)."""
	_require_admin()
	page = int(page or 1)
	page_length = int(page_length or 20)
	filters = {"docstatus": 1}
	if q:
		filters["customer_name"] = ["like", f"%{q}%"]

	total = frappe.db.count("Sales Order", filters)
	rows = frappe.get_all(
		"Sales Order",
		filters=filters,
		fields=_order_fields(),
		order_by="transaction_date desc, creation desc",
		limit_start=(page - 1) * page_length,
		limit_page_length=page_length,
	)
	_attach_payment_info(rows)
	return {"orders": rows, "total": total, "page": page}


@frappe.whitelist()
def insights():
	"""Sales analytics + accounts-receivable (customer-wise & order-wise)."""
	_require_admin()
	from ppf.api.payments import get_order_payment_info

	currency = get_default_currency()

	orders = frappe.get_all(
		"Sales Order",
		filters={"docstatus": 1},
		fields=[
			"name",
			"customer",
			"customer_name",
			"transaction_date",
			"grand_total",
			"advance_paid",
			"currency",
		],
		order_by="transaction_date desc, creation desc",
		limit_page_length=2000,
	)

	total_sales = total_collected = total_outstanding = overdue_amount = 0.0
	by_customer = {}
	by_order = []

	for o in orders:
		info = get_order_payment_info(o)
		paid, pending = info["paid"], info["pending"]
		status = info["payment_status"]
		gt = flt(o.grand_total)

		total_sales += gt
		total_collected += paid
		total_outstanding += pending
		if status == "Overdue":
			overdue_amount += pending

		c = by_customer.setdefault(
			o.customer,
			{
				"customer": o.customer,
				"customer_name": o.customer_name,
				"credit_days": info["credit_days"],
				"orders": 0,
				"total": 0.0,
				"paid": 0.0,
				"outstanding": 0.0,
				"overdue": 0.0,
			},
		)
		c["orders"] += 1
		c["total"] += gt
		c["paid"] += paid
		c["outstanding"] += pending
		if status == "Overdue":
			c["overdue"] += pending

		by_order.append(
			{
				"name": o.name,
				"customer_name": o.customer_name,
				"transaction_date": str(o.transaction_date),
				"grand_total": gt,
				"paid": paid,
				"pending": pending,
				"payment_status": status,
				"credit_days": info["credit_days"],
			}
		)

	customers = sorted(by_customer.values(), key=lambda x: x["outstanding"], reverse=True)
	top_customers = sorted(by_customer.values(), key=lambda x: x["total"], reverse=True)[:5]

	# Monthly sales (current year) from Sales Invoices.
	year = getdate(nowdate()).year
	monthly = []
	for mo in range(1, 13):
		start = getdate(f"{year}-{mo:02d}-01")
		monthly.append({"month": MONTH_ABBR[mo - 1], "amount": _sales_total(start, get_last_day(start))})

	return {
		"currency": currency,
		"summary": {
			"total_sales": total_sales,
			"total_collected": total_collected,
			"total_outstanding": total_outstanding,
			"overdue_amount": overdue_amount,
			"order_count": len(orders),
			"customers_with_dues": len([c for c in customers if c["outstanding"] > 0]),
		},
		"monthly_sales": monthly,
		"top_customers": top_customers,
		"by_customer": customers,
		"by_order": by_order,
	}


@frappe.whitelist()
def product_sales_report(from_date=None, to_date=None):
	"""Product sales report: total qty, highest single-order qty, top customer per product."""
	_require_admin()
	from frappe.utils import add_days, getdate, nowdate

	to_d = getdate(to_date) if to_date else getdate(nowdate())
	from_d = getdate(from_date) if from_date else add_days(to_d, -30)

	rows = frappe.db.sql(
		"""
		select soi.item_name as item_name, sum(soi.qty) as total_qty,
		       max(soi.qty) as highest_qty, sum(soi.amount) as amount
		from `tabSales Order Item` soi
		join `tabSales Order` so on so.name = soi.parent
		where so.docstatus = 1 and so.transaction_date between %(f)s and %(t)s
		group by soi.item_name order by total_qty desc
		""",
		{"f": from_d, "t": to_d},
		as_dict=True,
	)
	for r in rows:
		top = frappe.db.sql(
			"""
			select so.customer_name as customer_name, sum(soi.qty) as qty
			from `tabSales Order Item` soi
			join `tabSales Order` so on so.name = soi.parent
			where so.docstatus = 1 and so.transaction_date between %(f)s and %(t)s
			  and soi.item_name = %(it)s
			group by so.customer_name order by qty desc limit 1
			""",
			{"f": from_d, "t": to_d, "it": r.item_name},
			as_dict=True,
		)
		r["top_customer"] = top[0].customer_name if top else "—"
		r["total_qty"] = flt(r.total_qty)
		r["highest_qty"] = flt(r.highest_qty)
		r["amount"] = flt(r.amount)

	return {
		"from_date": str(from_d),
		"to_date": str(to_d),
		"currency": get_default_currency(),
		"products": rows,
	}


TALLY_DT = "Tally Integration Settings"
TALLY_KEYS = [
	"tally_enabled",
	"base_url",
	"tally_company",
	"port",
	"api_key",
	"api_secret",
	"webhook_url",
	"sync_mode",
	"sync_frequency",
	"default_sales_ledger",
	"default_purchase_ledger",
	"default_party_ledger",
	"connection_status",
	"last_sync",
]


@frappe.whitelist()
def get_tally_settings():
	"""Read the Tally Integration Settings (UI placeholder; persisted in ERPNext)."""
	_require_admin()
	from ppf.setup import ensure_tally_settings

	ensure_tally_settings()
	out = {}
	for k in TALLY_KEYS:
		out[k] = frappe.db.get_single_value(TALLY_DT, k)
	out["tally_enabled"] = bool(out.get("tally_enabled"))
	out["connection_status"] = out.get("connection_status") or "Not Connected"
	return out


@frappe.whitelist(methods=["POST"])
def update_tally_settings(**kwargs):
	"""Save the Tally Integration Settings."""
	_require_admin()
	from frappe.utils import cint

	from ppf.setup import ensure_tally_settings

	ensure_tally_settings()
	for k in TALLY_KEYS:
		if k in ("connection_status", "last_sync"):
			continue
		if k in kwargs:
			val = cint(kwargs[k]) if k == "tally_enabled" else kwargs[k]
			frappe.db.set_single_value(TALLY_DT, k, val)
	frappe.db.commit()  # nosemgrep
	return get_tally_settings()


@frappe.whitelist()
def get_settings():
	"""Admin: read store settings (delivery charges)."""
	_require_admin()
	from ppf.api.settings import get_delivery_config

	return get_delivery_config()


@frappe.whitelist(methods=["POST"])
def update_settings(delivery_charge_enabled=0, delivery_charge_amount=0, free_delivery_above=0):
	"""Admin: update delivery-charge settings."""
	_require_admin()
	from frappe.utils import cint

	from ppf.setup import ensure_ppf_settings

	ensure_ppf_settings()
	frappe.db.set_single_value("PPF Settings", "delivery_charge_enabled", cint(delivery_charge_enabled))
	frappe.db.set_single_value("PPF Settings", "delivery_charge_amount", flt(delivery_charge_amount))
	frappe.db.set_single_value("PPF Settings", "free_delivery_above", flt(free_delivery_above))
	frappe.db.commit()  # nosemgrep
	from ppf.api.settings import get_delivery_config

	return get_delivery_config()


@frappe.whitelist()
def monthly_report(month=None):
	"""Consolidated month report: top 5 customers, orders and products."""
	_require_admin()
	ref = getdate(month + "-01") if month else getdate(nowdate())
	start, end = get_first_day(ref), get_last_day(ref)
	currency = get_default_currency()

	orders = frappe.get_all(
		"Sales Order",
		filters={"docstatus": 1, "transaction_date": ["between", [start, end]]},
		fields=["name", "customer_name", "grand_total", "transaction_date", "status", "advance_paid"],
		order_by="grand_total desc",
		limit_page_length=5000,
	)

	by_cust = {}
	total = 0.0
	all_orders = []
	for o in orders:
		total += flt(o.grand_total)
		c = by_cust.setdefault(o.customer_name, {"customer_name": o.customer_name, "amount": 0.0, "orders": 0})
		c["amount"] += flt(o.grand_total)
		c["orders"] += 1
		all_orders.append(
			{
				"name": o.name,
				"customer_name": o.customer_name,
				"transaction_date": str(o.transaction_date),
				"status": o.status,
				"grand_total": flt(o.grand_total),
				"paid": flt(o.advance_paid),
				"pending": max(flt(o.grand_total) - flt(o.advance_paid), 0),
			}
		)

	# All orders sorted by date (newest first) for the full listing.
	all_orders.sort(key=lambda x: x["transaction_date"], reverse=True)

	top_customers = sorted(by_cust.values(), key=lambda x: x["amount"], reverse=True)[:5]
	top_orders = [
		{"name": o.name, "customer_name": o.customer_name, "amount": flt(o.grand_total)} for o in orders[:5]
	]

	products = frappe.db.sql(
		"""
		select soi.item_name as item_name, sum(soi.qty) as qty, sum(soi.amount) as amount
		from `tabSales Order Item` soi
		join `tabSales Order` so on so.name = soi.parent
		where so.docstatus = 1 and so.transaction_date between %(start)s and %(end)s
		group by soi.item_name order by amount desc limit 5
		""",
		{"start": start, "end": end},
		as_dict=True,
	)

	return {
		"currency": currency,
		"month": f"{MONTH_ABBR[getdate(ref).month - 1]} {getdate(ref).year}",
		"total_sales": total,
		"order_count": len(orders),
		"top_customers": top_customers,
		"top_orders": top_orders,
		"top_products": [
			{"item_name": p.item_name, "qty": flt(p.qty), "amount": flt(p.amount)} for p in products
		],
		"all_orders": all_orders,
	}


@frappe.whitelist()
def monthly_report_pdf(month=None):
	"""Render the consolidated monthly report (summary + top5 + all orders) as a PDF."""
	_require_admin()
	from ppf.api.notifications import LOGO, _money, _save_public_pdf

	rep = monthly_report(month)
	c = rep["currency"]

	def money(v):
		return _money(v) if c == "INR" else f"{flt(v):,.2f}"

	cust_rows = "".join(
		f"<tr><td>{i+1}. {r['customer_name']}</td><td class='r'>{r['orders']}</td><td class='r'>{money(r['amount'])}</td></tr>"
		for i, r in enumerate(rep["top_customers"])
	)
	prod_rows = "".join(
		f"<tr><td>{i+1}. {r['item_name']}</td><td class='r'>{r['qty']:g}</td><td class='r'>{money(r['amount'])}</td></tr>"
		for i, r in enumerate(rep["top_products"])
	)
	order_rows = "".join(
		f"<tr><td>{o['name']}</td><td>{o['customer_name']}</td><td>{o['transaction_date']}</td>"
		f"<td>{o['status']}</td><td class='r'>{money(o['grand_total'])}</td>"
		f"<td class='r'>{money(o['paid'])}</td><td class='r'>{money(o['pending'])}</td></tr>"
		for o in rep["all_orders"]
	)

	html = f"""
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page{{margin:0}}
body{{font-family:'Helvetica Neue',Arial,sans-serif;color:#1A1A2E;margin:0;font-size:12px}}
.band{{background:#5B21B6;color:#fff;padding:20px 28px}}
.band img{{width:48px;height:48px;border-radius:50%;background:#fff;padding:2px;vertical-align:middle}}
.brand{{font-size:18px;font-weight:bold;display:inline-block;vertical-align:middle;margin-left:10px}}
.content{{padding:22px 28px}}
h2{{color:#5B21B6;font-size:14px;margin:18px 0 6px}}
.sum td{{padding:4px 12px 4px 0;font-size:13px}}
.sum b{{color:#5B21B6;font-size:16px}}
table.t{{width:100%;border-collapse:collapse;margin-top:6px}}
table.t th{{background:#EDE9FE;color:#5B21B6;text-align:left;padding:7px;font-size:10px;text-transform:uppercase}}
table.t td{{padding:7px;border-bottom:1px solid #eee}}
table.t tr:nth-child(even) td{{background:#FAF9FE}}
.r{{text-align:right}}
.foot{{margin-top:22px;color:#999;font-size:10px;text-align:center}}
</style></head><body>
<div class="band"><img src="{LOGO}"><span class="brand">Purple Patch Farms</span></div>
<div class="content">
<h2>Monthly Report — {rep['month']}</h2>
<table class="sum"><tr>
  <td>Total Sales<br><b>{money(rep['total_sales'])}</b></td>
  <td>Orders<br><b>{rep['order_count']}</b></td>
</tr></table>

<h2>Top 5 Customers</h2>
<table class="t"><tr><th>Customer</th><th class="r">Orders</th><th class="r">Amount</th></tr>{cust_rows}</table>

<h2>Top 5 Products</h2>
<table class="t"><tr><th>Product</th><th class="r">Qty</th><th class="r">Amount</th></tr>{prod_rows}</table>

<h2>All Orders ({len(rep['all_orders'])})</h2>
<table class="t"><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th>
<th class="r">Total</th><th class="r">Paid</th><th class="r">Pending</th></tr>{order_rows}</table>
<div class="foot">Generated by Purple Patch Farms · {rep['month']}</div>
</div></body></html>"""

	url = _save_public_pdf(html, f"Monthly-Report-{rep['month'].replace(' ', '-')}.pdf", None, None)
	return {"url": url}


@frappe.whitelist()
def list_customers(q=None):
	"""Customers with their credit-days setting (for the admin Customers screen)."""
	_require_admin()
	filters = {"disabled": 0}
	if q:
		filters["customer_name"] = ["like", f"%{q}%"]
	has_cd = frappe.db.has_column("Customer", "custom_credit_days")
	fields = ["name", "customer_name", "customer_group", "mobile_no"]
	if has_cd:
		fields.append("custom_credit_days")
	rows = frappe.get_all("Customer", filters=filters, fields=fields, order_by="customer_name asc", limit_page_length=500)
	from ppf.api.utils import get_primary_address

	for r in rows:
		r["credit_days"] = r.get("custom_credit_days") or 0
		r["address"] = get_primary_address(r["name"])
	return rows


@frappe.whitelist()
def get_customer(customer):
	"""Full customer detail for the admin edit form (incl. primary address)."""
	_require_admin()
	from ppf.api.utils import get_primary_address

	doc = frappe.db.get_value(
		"Customer", customer, ["name", "customer_name", "mobile_no", "custom_credit_days"], as_dict=True
	)
	if not doc:
		frappe.throw(_("Customer not found."))
	doc["credit_days"] = doc.get("custom_credit_days") or 0
	doc["address"] = get_primary_address(customer)
	return doc


@frappe.whitelist(methods=["POST"])
def update_customer(
	customer,
	mobile_no=None,
	credit_days=None,
	address_line1=None,
	address_line2=None,
	city=None,
	state=None,
	pincode=None,
	country=None,
):
	"""Update a customer's mobile number, credit days and/or primary address."""
	_require_admin()
	from ppf.api.utils import upsert_primary_address

	if not frappe.db.exists("Customer", customer):
		frappe.throw(_("Customer not found."))
	if mobile_no is not None:
		frappe.db.set_value("Customer", customer, "mobile_no", mobile_no)
	if credit_days is not None:
		frappe.db.set_value("Customer", customer, "custom_credit_days", int(credit_days or 0))
	if address_line1:
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
	frappe.db.commit()  # nosemgrep
	return get_customer(customer)


@frappe.whitelist(methods=["POST"])
def set_credit_days(customer, days):
	"""Set the credit-days window for a customer."""
	_require_admin()
	if not frappe.db.exists("Customer", customer):
		frappe.throw(_("Customer not found."))
	frappe.db.set_value("Customer", customer, "custom_credit_days", int(days or 0))
	frappe.db.commit()  # nosemgrep
	return {"customer": customer, "credit_days": int(days or 0)}


@frappe.whitelist(methods=["POST"])
def mark_paid(sales_order):
	"""Mark an order fully paid by recording a Payment Entry for the outstanding."""
	_require_admin()
	from ppf.api.payments import _record_payment, get_order_payment_info

	info = get_order_payment_info(sales_order)
	if info["pending"] <= 0:
		return {"sales_order": sales_order, "payment_status": "Paid", "pending": 0}
	_record_payment(sales_order, amount=info["pending"], reference_no=f"manual-{sales_order}", mode_of_payment="Cash")
	return get_order_payment_info(sales_order)


@frappe.whitelist(methods=["POST"])
def unmark_paid(sales_order):
	"""Undo a manual 'Mark as Paid' by cancelling the manual Payment Entry."""
	_require_admin()
	from ppf.api.payments import get_order_payment_info

	if not frappe.db.exists("Sales Order", sales_order):
		frappe.throw(_("Order not found."))
	# mark_paid records the payment with reference_no = f"manual-{sales_order}".
	names = frappe.get_all(
		"Payment Entry",
		filters={"reference_no": f"manual-{sales_order}", "docstatus": 1},
		pluck="name",
	)
	if not names:
		frappe.throw(_("No manual payment was found to undo for this order."))
	for n in names:
		pe = frappe.get_doc("Payment Entry", n)
		pe.flags.ignore_permissions = True
		pe.cancel()
	frappe.db.commit()  # nosemgrep
	return get_order_payment_info(sales_order)


@frappe.whitelist(methods=["POST"])
def change_delivery_day(sales_order, date):
	"""Update the delivery date on a Sales Order (header + lines)."""
	_require_admin()
	if not frappe.db.exists("Sales Order", sales_order):
		frappe.throw(_("Order not found."))
	frappe.db.set_value("Sales Order", sales_order, "delivery_date", getdate(date))
	for item in frappe.get_all("Sales Order Item", filters={"parent": sales_order}, pluck="name"):
		frappe.db.set_value("Sales Order Item", item, "delivery_date", getdate(date))
	frappe.db.commit()  # nosemgrep
	return {"sales_order": sales_order, "delivery_date": str(getdate(date))}


@frappe.whitelist()
def order_detail(sales_order):
	"""Full order detail for the in-app order editor (header + line items)."""
	_require_admin()
	from ppf.api.payments import get_order_payment_info

	so = frappe.get_doc("Sales Order", sales_order)
	info = get_order_payment_info(so.name)
	return {
		"name": so.name,
		"customer": so.customer,
		"customer_name": so.customer_name,
		"transaction_date": str(so.transaction_date),
		"delivery_date": str(so.delivery_date) if so.delivery_date else None,
		"status": so.status,
		"docstatus": so.docstatus,
		"currency": so.currency,
		"grand_total": flt(so.grand_total),
		"per_billed": flt(so.per_billed),
		"per_delivered": flt(so.per_delivered),
		"payment_status": info["payment_status"],
		"items": [
			{
				"docname": d.name,
				"item_code": d.item_code,
				"item_name": d.item_name,
				"qty": flt(d.qty),
				"uom": d.uom,
				"rate": flt(d.rate),
				"amount": flt(d.amount),
				"delivered_qty": flt(d.delivered_qty),
				"billed_amt": flt(d.billed_amt),
			}
			for d in so.items
		],
	}


@frappe.whitelist(methods=["POST"])
def update_order(sales_order, items, delivery_date=None):
	"""Edit a Sales Order in-place: line qty/rate, add/remove lines, delivery date.

	Submitted orders go through ERPNext's ``update_child_qty_rate`` so the
	billed/delivered guards are respected; drafts are edited directly. This lets
	the admin app edit orders without bouncing to the ERPNext desk.
	"""
	_require_admin()
	import json as _json

	if isinstance(items, str):
		items = _json.loads(items)
	if not frappe.db.exists("Sales Order", sales_order):
		frappe.throw(_("Order not found."))

	items = [it for it in (items or []) if flt(it.get("qty")) > 0]
	if not items:
		frappe.throw(_("An order must have at least one line item."))

	so = frappe.get_doc("Sales Order", sales_order)
	dd = getdate(delivery_date) if delivery_date else None

	if so.docstatus == 1:
		trans_items = []
		for it in items:
			row = {
				"item_code": it.get("item_code"),
				"qty": flt(it.get("qty")),
				"rate": flt(it.get("rate")),
			}
			if it.get("docname"):
				row["docname"] = it.get("docname")
			if it.get("uom"):
				row["uom"] = it.get("uom")
			if dd:
				row["delivery_date"] = str(dd)
			trans_items.append(row)

		from erpnext.controllers.accounts_controller import update_child_qty_rate

		update_child_qty_rate("Sales Order", _json.dumps(trans_items), sales_order)

		if dd:
			frappe.db.set_value("Sales Order", sales_order, "delivery_date", dd)
			for d in frappe.get_all("Sales Order Item", filters={"parent": sales_order}, pluck="name"):
				frappe.db.set_value("Sales Order Item", d, "delivery_date", dd)
	else:
		if dd:
			so.delivery_date = dd
		so.set("items", [])
		for it in items:
			so.append(
				"items",
				{
					"item_code": it.get("item_code"),
					"qty": flt(it.get("qty")),
					"rate": flt(it.get("rate")),
					"uom": it.get("uom") or None,
					"delivery_date": dd or so.delivery_date,
				},
			)
		so.flags.ignore_permissions = True
		so.save(ignore_permissions=True)

	frappe.db.commit()  # nosemgrep
	return order_detail(sales_order)


@frappe.whitelist(methods=["POST"])
def bill_now(sales_order):
	"""Create (and submit) a Sales Invoice from a Sales Order (A3)."""
	_require_admin()
	from erpnext.selling.doctype.sales_order.sales_order import make_sales_invoice

	si = make_sales_invoice(sales_order)
	si.insert()
	try:
		si.submit()
	except Exception as e:
		frappe.db.commit()  # nosemgrep
		return {"sales_invoice": si.name, "status": si.status, "submitted": False, "warning": str(e)}
	frappe.db.commit()  # nosemgrep
	return {"sales_invoice": si.name, "status": si.status, "submitted": True}


@frappe.whitelist()
def invoices(q=None, page=1, page_length=20):
	"""Paged submitted Sales Invoices for the admin Invoice screen."""
	_require_admin()
	page = int(page or 1)
	page_length = int(page_length or 20)
	filters = {"docstatus": 1}
	if q:
		filters["customer_name"] = ["like", f"%{q}%"]

	total = frappe.db.count("Sales Invoice", filters)
	rows = frappe.get_all(
		"Sales Invoice",
		filters=filters,
		fields=[
			"name",
			"customer",
			"customer_name",
			"posting_date",
			"due_date",
			"grand_total",
			"outstanding_amount",
			"status",
			"currency",
		],
		order_by="posting_date desc, creation desc",
		limit_start=(page - 1) * page_length,
		limit_page_length=page_length,
	)
	return {"invoices": rows, "total": total, "page": page}


@frappe.whitelist(methods=["POST"])
def create_order(customer, items, delivery_date=None):
	"""Admin: create + submit a Sales Order for a chosen customer (A8)."""
	_require_admin()
	import json as _json

	if isinstance(items, str):
		items = _json.loads(items)
	if not customer or not frappe.db.exists("Customer", customer):
		frappe.throw(_("Please select a valid customer."))

	items = [it for it in (items or []) if flt(it.get("qty")) > 0]
	if not items:
		frappe.throw(_("Add at least one item with a quantity."))

	company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value(
		"Global Defaults", "default_company"
	)
	dd = getdate(delivery_date) if delivery_date else getdate(add_days(nowdate(), 1))

	doc = frappe.new_doc("Sales Order")
	doc.customer = customer
	doc.company = company
	doc.transaction_date = nowdate()
	doc.delivery_date = dd
	doc.order_type = "Sales"
	price_list = get_default_selling_price_list()
	if price_list:
		doc.selling_price_list = price_list

	for it in items:
		row = {"item_code": it.get("item_code"), "qty": flt(it.get("qty")), "delivery_date": dd}
		if it.get("rate") not in (None, ""):
			row["rate"] = flt(it.get("rate"))
		if it.get("uom"):
			row["uom"] = it.get("uom")
		doc.append("items", row)

	doc.flags.ignore_permissions = True
	doc.save(ignore_permissions=True)
	doc.submit()
	frappe.db.commit()  # nosemgrep
	return {"sales_order": doc.name, "status": doc.status}


# ---------------------------------------------------------------------------
# Shipment / dispatch (A5)
# ---------------------------------------------------------------------------
def _date_range_filter(from_date, to_date):
	"""Build a Frappe filter clause for an optional [from_date, to_date] range."""
	frm = getdate(from_date) if from_date else None
	to = getdate(to_date) if to_date else None
	if frm and to:
		return ["between", [frm, to]]
	if frm:
		return [">=", frm]
	if to:
		return ["<=", to]
	return None


@frappe.whitelist()
def shipment_pending(from_date=None, to_date=None, bill_date=None):
	"""Submitted orders not fully delivered, optionally within a delivery-date range.

	``bill_date`` is kept for backwards compatibility (single-day lookup).
	"""
	_require_admin()
	filters = {"docstatus": 1, "per_delivered": ["<", 100]}
	if bill_date and not (from_date or to_date):
		filters["delivery_date"] = getdate(bill_date)
	else:
		rng = _date_range_filter(from_date, to_date)
		if rng:
			filters["delivery_date"] = rng
	rows = frappe.get_all(
		"Sales Order",
		filters=filters,
		fields=_order_fields(),
		order_by="delivery_date asc",
		limit_page_length=100,
	)
	return {"orders": rows, "total": len(rows)}


@frappe.whitelist()
def shipment_completed(from_date=None, to_date=None, shipped_date=None):
	"""Delivery Notes posted within a date range (completed shipments).

	``shipped_date`` is kept for backwards compatibility (single-day lookup).
	"""
	_require_admin()
	filters = {"docstatus": 1}
	if shipped_date and not (from_date or to_date):
		filters["posting_date"] = getdate(shipped_date)
	else:
		rng = _date_range_filter(from_date, to_date)
		if rng:
			filters["posting_date"] = rng
	rows = frappe.get_all(
		"Delivery Note",
		filters=filters,
		fields=["name", "customer", "customer_name", "posting_date", "grand_total", "status", "currency"],
		order_by="posting_date desc",
		limit_page_length=100,
	)
	return {"shipments": rows, "total": len(rows)}


@frappe.whitelist(methods=["POST"])
def dispatch(sales_order):
	"""Create (and submit) a Delivery Note against a Sales Order (A5)."""
	_require_admin()
	from erpnext.selling.doctype.sales_order.sales_order import make_delivery_note

	dn = make_delivery_note(sales_order)
	dn.insert()
	try:
		dn.submit()
	except Exception as e:
		frappe.db.commit()  # nosemgrep
		return {"delivery_note": dn.name, "submitted": False, "warning": str(e)}
	frappe.db.commit()  # nosemgrep
	return {"delivery_note": dn.name, "status": dn.status, "submitted": True}


# ---------------------------------------------------------------------------
# Product / rate / stock management
# ---------------------------------------------------------------------------
@frappe.whitelist()
def meta():
	"""Dropdown data for the product form (item groups limited to Fruits/Vegetables)."""
	_require_admin()
	for g in SELLABLE_ITEM_GROUPS:
		_ensure_item_group(g)
	return {
		"item_groups": SELLABLE_ITEM_GROUPS,
		"uoms": frappe.get_all("UOM", filters={"enabled": 1}, pluck="name"),
		"price_list": get_default_selling_price_list(),
		"currency": get_default_currency(),
	}


@frappe.whitelist()
def list_products():
	"""All sales items for admin management (includes disabled + stock + rate)."""
	_require_admin()
	items = frappe.get_all(
		"Item",
		filters={"is_sales_item": 1},
		fields=["item_code", "item_name", "item_group", "stock_uom", "image", "disabled"],
		order_by="modified desc",
		limit_page_length=500,
	)
	if not items:
		return []
	price_list = get_default_selling_price_list()
	rates = {}
	if price_list:
		for r in frappe.get_all(
			"Item Price",
			filters={"price_list": price_list, "item_code": ["in", [i.item_code for i in items]]},
			fields=["item_code", "price_list_rate", "uom"],
			order_by="valid_from desc",
		):
			rates.setdefault(r.item_code, r)
	has_stock = frappe.db.has_column("Item", "custom_published_stock")
	out = []
	for it in items:
		price = rates.get(it.item_code, {})
		out.append(
			{
				"item_code": it.item_code,
				"item_name": it.item_name,
				"item_group": it.item_group,
				"uom": price.get("uom") or it.stock_uom,
				"rate": price.get("price_list_rate") or 0,
				"image": it.image,
				"disabled": it.disabled,
				"published_stock": frappe.db.get_value("Item", it.item_code, "custom_published_stock")
				if has_stock
				else None,
			}
		)
	return out


@frappe.whitelist(methods=["POST"])
def save_product(
	item_name,
	rate,
	uom,
	item_group=None,
	item_code=None,
	image=None,
	published_stock=None,
	disabled=0,
):
	"""Create or update an Item + its selling Item Price + published stock."""
	_require_admin()
	rate = flt(rate)
	item_group = item_group or SELLABLE_ITEM_GROUPS[0]
	_ensure_item_group(item_group)

	if item_code and frappe.db.exists("Item", item_code):
		item = frappe.get_doc("Item", item_code)
	else:
		item = frappe.new_doc("Item")
		item.item_code = item_code or item_name

	item.item_name = item_name
	item.item_group = item_group
	item.stock_uom = uom
	item.is_sales_item = 1
	item.is_stock_item = 0
	item.disabled = int(disabled or 0)
	if image:
		item.image = image
	if frappe.db.has_column("Item", "custom_published_stock") and published_stock is not None:
		item.custom_published_stock = flt(published_stock)
	item.save()

	price_list = get_default_selling_price_list()
	if price_list:
		existing = frappe.db.get_value(
			"Item Price", {"item_code": item.name, "price_list": price_list, "uom": uom}, "name"
		)
		if existing:
			frappe.db.set_value("Item Price", existing, "price_list_rate", rate)
		else:
			frappe.get_doc(
				{
					"doctype": "Item Price",
					"item_code": item.name,
					"price_list": price_list,
					"uom": uom,
					"price_list_rate": rate,
					"selling": 1,
				}
			).insert()
	frappe.db.commit()  # nosemgrep
	return {"item_code": item.name, "item_name": item.item_name}
