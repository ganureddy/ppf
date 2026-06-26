import frappe
from frappe.utils import flt

from ppf.api.utils import require_login

DELIVERY_ITEM = "Delivery Charge"


def get_delivery_config():
	"""Delivery-charge configuration set by the admin (PPF Settings single)."""
	if not frappe.db.exists("DocType", "PPF Settings"):
		return {"enabled": False, "amount": 0, "free_above": 0}
	return {
		"enabled": bool(frappe.db.get_single_value("PPF Settings", "delivery_charge_enabled")),
		"amount": flt(frappe.db.get_single_value("PPF Settings", "delivery_charge_amount")),
		"free_above": flt(frappe.db.get_single_value("PPF Settings", "free_delivery_above")),
	}


def compute_delivery_fee(subtotal):
	cfg = get_delivery_config()
	if not cfg["enabled"]:
		return 0.0
	if cfg["free_above"] and flt(subtotal) >= cfg["free_above"]:
		return 0.0
	return flt(cfg["amount"])


def ensure_delivery_item():
	if frappe.db.exists("Item", DELIVERY_ITEM):
		return
	uom = "Nos" if frappe.db.exists("UOM", "Nos") else frappe.db.get_value("UOM", {}, "name")
	frappe.get_doc(
		{
			"doctype": "Item",
			"item_code": DELIVERY_ITEM,
			"item_name": DELIVERY_ITEM,
			"item_group": frappe.db.get_value("Item Group", {"is_group": 0}, "name") or "All Item Groups",
			"stock_uom": uom,
			"is_sales_item": 1,
			"is_stock_item": 0,
		}
	).insert(ignore_permissions=True)


@frappe.whitelist()
def delivery_config():
	"""Public (logged-in) delivery config for the customer cart/checkout."""
	require_login()
	return get_delivery_config()
