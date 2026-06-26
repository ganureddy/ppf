import frappe
from frappe import _


def require_login():
	"""Raise if the request is unauthenticated (Guest)."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Please login to continue."), frappe.AuthenticationError)


def get_current_customer():
	"""Resolve the ERPNext Customer linked to the logged-in User.

	Resolution order:
	1. Contact whose ``user`` == session user, linked to a Customer via Dynamic Link.
	2. Customer whose name/customer_name matches the user's full name (loose fallback).

	Returns the Customer name (docname) or ``None``.
	"""
	user = frappe.session.user
	if not user or user == "Guest":
		return None

	contact = frappe.db.get_value("Contact", {"user": user}, "name")
	if contact:
		customer = frappe.db.get_value(
			"Dynamic Link",
			{
				"parenttype": "Contact",
				"parent": contact,
				"link_doctype": "Customer",
			},
			"link_name",
		)
		if customer:
			return customer

	# Loose fallback: a Customer carrying the user's email in a custom field.
	if frappe.db.has_column("Customer", "custom_user"):
		customer = frappe.db.get_value("Customer", {"custom_user": user}, "name")
		if customer:
			return customer

	return None


def get_default_selling_price_list():
	price_list = frappe.db.get_single_value("Selling Settings", "selling_price_list")
	if price_list:
		return price_list
	# Common ERPNext default.
	if frappe.db.exists("Price List", "Standard Selling"):
		return "Standard Selling"
	return frappe.db.get_value("Price List", {"selling": 1}, "name")


def get_default_currency():
	return frappe.db.get_default("currency") or "INR"


ADDRESS_FIELDS = ("address_line1", "address_line2", "city", "state", "pincode", "country")


def get_primary_address(customer):
	"""Return the customer's primary/linked address as a dict (or None)."""
	if not customer:
		return None
	name = frappe.db.get_value(
		"Dynamic Link",
		{"link_doctype": "Customer", "link_name": customer, "parenttype": "Address"},
		"parent",
	)
	if not name:
		return None
	return frappe.db.get_value("Address", name, ["name", *ADDRESS_FIELDS], as_dict=True)


def upsert_primary_address(customer, data):
	"""Create or update the customer's primary address from ``data``."""
	name = frappe.db.get_value(
		"Dynamic Link",
		{"link_doctype": "Customer", "link_name": customer, "parenttype": "Address"},
		"parent",
	)
	if name:
		addr = frappe.get_doc("Address", name)
		creating = False
	else:
		addr = frappe.new_doc("Address")
		addr.address_title = customer
		addr.address_type = "Billing"
		addr.is_primary_address = 1
		addr.append("links", {"link_doctype": "Customer", "link_name": customer})
		creating = True

	for k in ADDRESS_FIELDS:
		if data.get(k) is not None:
			setattr(addr, k, data.get(k))

	if not addr.address_line1:
		frappe.throw(_("Address line 1 is required."))

	addr.flags.ignore_permissions = True
	(addr.insert if creating else addr.save)(ignore_permissions=True)
	frappe.db.commit()  # nosemgrep
	return addr.name
