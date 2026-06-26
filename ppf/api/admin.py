import frappe
from frappe import _
from frappe.utils import add_months, flt, get_first_day, get_last_day, getdate, nowdate

from ppf.api.utils import (
	get_default_currency,
	get_default_selling_price_list,
	require_login,
)

MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _require_admin():
	require_login()
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required."), frappe.AuthenticationError)


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


# ---------------------------------------------------------------------------
# Shipment / dispatch (A5)
# ---------------------------------------------------------------------------
@frappe.whitelist()
def shipment_pending(bill_date=None):
	"""Submitted orders that are not fully delivered (optionally by delivery date)."""
	_require_admin()
	filters = {"docstatus": 1, "per_delivered": ["<", 100]}
	if bill_date:
		filters["delivery_date"] = getdate(bill_date)
	rows = frappe.get_all(
		"Sales Order",
		filters=filters,
		fields=_order_fields(),
		order_by="delivery_date asc",
		limit_page_length=100,
	)
	return {"orders": rows, "total": len(rows)}


@frappe.whitelist()
def shipment_completed(shipped_date=None):
	"""Delivery Notes posted on the given date (completed shipments)."""
	_require_admin()
	filters = {"docstatus": 1}
	if shipped_date:
		filters["posting_date"] = getdate(shipped_date)
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
	"""Dropdown data for the product form."""
	_require_admin()
	return {
		"item_groups": frappe.get_all("Item Group", filters={"is_group": 0}, pluck="name"),
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
	item_group = item_group or frappe.db.get_value("Item Group", {"is_group": 0}, "name")

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
