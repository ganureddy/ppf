"""One-time / idempotent setup for the Purple Patch Farms app.

Run with:
    bench --site <site> execute ppf.setup.ensure_custom_fields

Also wired to run after every migrate (see hooks.after_migrate).
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def ensure_ppf_settings():
	"""Create the PPF Settings single doctype (delivery charges, etc.)."""
	if frappe.db.exists("DocType", "PPF Settings"):
		return
	frappe.get_doc(
		{
			"doctype": "DocType",
			"name": "PPF Settings",
			"module": "Ppf",
			"issingle": 1,
			"custom": 1,
			"fields": [
				{"fieldname": "delivery_charge_enabled", "label": "Enable Delivery Charges", "fieldtype": "Check"},
				{"fieldname": "delivery_charge_amount", "label": "Delivery Charge Amount", "fieldtype": "Currency"},
				{"fieldname": "free_delivery_above", "label": "Free Delivery Above (0 = never)", "fieldtype": "Currency"},
			],
			"permissions": [
				{"role": "System Manager", "read": 1, "write": 1, "create": 1},
			],
		}
	).insert(ignore_permissions=True)
	frappe.db.commit()  # nosemgrep
	print("PPF Settings doctype created.")


TALLY_FIELDS = [
	{"fieldname": "sec_conn", "label": "Connection", "fieldtype": "Section Break"},
	{"fieldname": "tally_enabled", "label": "Enable Tally Integration", "fieldtype": "Check"},
	{"fieldname": "base_url", "label": "Tally Server / Base URL", "fieldtype": "Data"},
	{"fieldname": "tally_company", "label": "Tally Company Name", "fieldtype": "Data"},
	{"fieldname": "port", "label": "Tally Port", "fieldtype": "Data"},
	{"fieldname": "sec_auth", "label": "Authentication", "fieldtype": "Section Break"},
	{"fieldname": "api_key", "label": "API Key", "fieldtype": "Data"},
	{"fieldname": "api_secret", "label": "API Secret", "fieldtype": "Data"},
	{"fieldname": "webhook_url", "label": "Webhook URL", "fieldtype": "Data"},
	{"fieldname": "sec_sync", "label": "Sync", "fieldtype": "Section Break"},
	{"fieldname": "sync_mode", "label": "Sync Mode", "fieldtype": "Select", "options": "Real-time\nScheduled\nManual"},
	{"fieldname": "sync_frequency", "label": "Sync Frequency", "fieldtype": "Select", "options": "Every 15 Minutes\nHourly\nDaily"},
	{"fieldname": "sec_ledger", "label": "Ledger Mapping", "fieldtype": "Section Break"},
	{"fieldname": "default_sales_ledger", "label": "Default Sales Ledger", "fieldtype": "Data"},
	{"fieldname": "default_purchase_ledger", "label": "Default Purchase Ledger", "fieldtype": "Data"},
	{"fieldname": "default_party_ledger", "label": "Default Party Ledger", "fieldtype": "Data"},
	{"fieldname": "sec_status", "label": "Status", "fieldtype": "Section Break"},
	{"fieldname": "connection_status", "label": "Connection Status", "fieldtype": "Data", "read_only": 1, "default": "Not Connected"},
	{"fieldname": "last_sync", "label": "Last Sync", "fieldtype": "Datetime", "read_only": 1},
]


def ensure_tally_settings():
	"""Create the Tally Integration Settings single doctype (UI placeholder)."""
	if frappe.db.exists("DocType", "Tally Integration Settings"):
		return
	frappe.get_doc(
		{
			"doctype": "DocType",
			"name": "Tally Integration Settings",
			"module": "Ppf",
			"issingle": 1,
			"custom": 1,
			"fields": TALLY_FIELDS,
			"permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1}],
		}
	).insert(ignore_permissions=True)
	frappe.db.commit()  # nosemgrep
	print("Tally Integration Settings doctype created.")


def set_wati_config(url=None, token=None, whatsapp_number=None):
	"""Save WATI credentials directly into the single (no controller import)."""
	if url is not None:
		frappe.db.set_single_value("WATI Setting", "url", url)
	if token is not None:
		frappe.db.set_single_value("WATI Setting", "token", token)
	if whatsapp_number is not None:
		frappe.db.set_single_value("WATI Setting", "whatsapp_number", whatsapp_number)
	frappe.db.commit()  # nosemgrep
	print("WATI Setting saved.")


def ensure_custom_fields():
	"""Create the custom fields the PWAs rely on (idempotent)."""
	create_custom_fields(
		{
			"Item": [
				{
					"fieldname": "custom_published_stock",
					"label": "Published Stock",
					"fieldtype": "Float",
					"insert_after": "stock_uom",
					"description": "Stock quantity published to the customer PWA.",
					"non_negative": 1,
				}
			],
			"Customer": [
				{
					"fieldname": "custom_credit_days",
					"label": "Credit Days (PWA)",
					"fieldtype": "Int",
					"insert_after": "customer_group",
					"description": "Days after the order date before payment is marked Overdue.",
					"non_negative": 1,
				}
			],
			"Sales Order": [
				{
					"fieldname": "custom_razorpay_order_id",
					"label": "Razorpay Order ID",
					"fieldtype": "Data",
					"insert_after": "status",
					"read_only": 1,
				},
				{
					"fieldname": "custom_fulfillment_status",
					"label": "Fulfillment Status (PWA)",
					"fieldtype": "Select",
					"options": "Received\nProcessing\nDispatched\nDelivered",
					"default": "Received",
					"insert_after": "custom_razorpay_order_id",
				},
			],
		},
		ignore_validate=True,
	)
	frappe.db.commit()  # nosemgrep
	print("Custom fields ensured.")
