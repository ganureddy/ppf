import frappe
from frappe import _
from frappe.utils import add_days, nowdate

from ppf.api.utils import (
	get_current_customer,
	get_default_selling_price_list,
	require_login,
)

CART_FLAG = "custom_is_pwa_cart"


def _get_cart_doc(customer, create=False):
	"""Return the customer's draft (cart) Sales Order, optionally creating it."""
	filters = {"customer": customer, "docstatus": 0}
	if frappe.db.has_column("Sales Order", CART_FLAG):
		filters[CART_FLAG] = 1

	name = frappe.db.get_value("Sales Order", filters, "name", order_by="modified desc")
	if name:
		return frappe.get_doc("Sales Order", name)

	if not create:
		return None

	company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value(
		"Global Defaults", "default_company"
	)
	doc = frappe.new_doc("Sales Order")
	doc.customer = customer
	doc.company = company
	doc.transaction_date = nowdate()
	doc.delivery_date = add_days(nowdate(), 1)
	doc.order_type = "Sales"
	price_list = get_default_selling_price_list()
	if price_list:
		doc.selling_price_list = price_list
	if frappe.db.has_column("Sales Order", CART_FLAG):
		doc.set(CART_FLAG, 1)
	return doc


def _serialize_cart(doc):
	if not doc:
		return {"name": None, "items": [], "item_count": 0, "total": 0, "currency": None}
	return {
		"name": doc.name,
		"items": [
			{
				"item_code": d.item_code,
				"item_name": d.item_name,
				"qty": d.qty,
				"uom": d.uom,
				"rate": d.rate,
				"amount": d.amount,
			}
			for d in doc.get("items", [])
		],
		"item_count": len(doc.get("items", [])),
		"total": doc.get("total") or 0,
		"currency": doc.get("currency"),
	}


@frappe.whitelist()
def get():
	"""Return the current customer's draft cart."""
	require_login()
	customer = get_current_customer()
	if not customer:
		return _serialize_cart(None)
	return _serialize_cart(_get_cart_doc(customer))


@frappe.whitelist(methods=["POST"])
def set_item(item_code, qty):
	"""Set the quantity of an item in the cart. qty<=0 removes the line."""
	require_login()
	customer = get_current_customer()
	if not customer:
		frappe.throw(_("No customer is linked to your account. Please contact us."))

	qty = float(qty)
	doc = _get_cart_doc(customer, create=True)

	existing = None
	for d in doc.get("items", []):
		if d.item_code == item_code:
			existing = d
			break

	if qty <= 0:
		if existing:
			doc.remove(existing)
	elif existing:
		existing.qty = qty
	else:
		doc.append("items", {"item_code": item_code, "qty": qty})

	doc.flags.ignore_permissions = True
	doc.save(ignore_permissions=True)
	frappe.db.commit()  # nosemgrep
	return _serialize_cart(doc)


@frappe.whitelist(methods=["POST"])
def checkout():
	"""Submit the draft cart into a placed Sales Order."""
	require_login()
	customer = get_current_customer()
	if not customer:
		frappe.throw(_("No customer is linked to your account. Please contact us."))

	doc = _get_cart_doc(customer)
	if not doc or not doc.get("items"):
		frappe.throw(_("Your cart is empty."))

	# Add an admin-configured delivery charge line (only when enabled & applicable).
	from ppf.api.settings import DELIVERY_ITEM, compute_delivery_fee, ensure_delivery_item

	subtotal = sum(d.amount for d in doc.get("items", []) if d.item_code != DELIVERY_ITEM)
	fee = compute_delivery_fee(subtotal)
	doc.set("items", [d for d in doc.get("items", []) if d.item_code != DELIVERY_ITEM])
	if fee > 0:
		ensure_delivery_item()
		doc.append("items", {"item_code": DELIVERY_ITEM, "qty": 1, "rate": fee, "delivery_date": doc.delivery_date})

	doc.flags.ignore_permissions = True
	doc.save(ignore_permissions=True)
	doc.submit()
	frappe.db.commit()  # nosemgrep

	# Fire the order-confirmation WhatsApp in the background so a WATI/PDF
	# hiccup can never fail the checkout itself.
	frappe.enqueue(
		"ppf.api.notifications.send_order_confirmation",
		queue="short",
		sales_order=doc.name,
		enqueue_after_commit=True,
	)
	return {"sales_order": doc.name, "status": doc.status}
