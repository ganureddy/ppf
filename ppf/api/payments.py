import hashlib
import hmac
import json

import frappe
import requests
from frappe import _
from frappe.utils import add_days, flt, get_url, getdate, nowdate

from ppf.api.utils import get_current_customer, require_login

RAZORPAY_API = "https://api.razorpay.com/v1"
# Domain approved on the Razorpay account (sent in order notes for reference).
APPROVED_SITE = "https://ztarx.myshopify.com"

ACTIVE_PAID = ("Paid",)


def _razorpay_creds():
	rs = frappe.get_doc("Razorpay Settings")
	key = rs.api_key
	secret = rs.get_password("api_secret")
	if not key or not secret:
		frappe.throw(_("Razorpay is not configured. Please contact support."))
	return key, secret


def get_order_payment_info(so):
	"""Compute paid/pending amounts and a payment status for a Sales Order.

	``so`` may be a docname or a dict with the needed fields.
	"""
	if isinstance(so, str):
		so = frappe.db.get_value(
			"Sales Order",
			so,
			["name", "customer", "grand_total", "advance_paid", "transaction_date", "currency"],
			as_dict=True,
		)
	grand_total = flt(so.get("grand_total"))
	paid = flt(so.get("advance_paid"))
	pending = max(grand_total - paid, 0)

	credit_days = (
		frappe.db.get_value("Customer", so.get("customer"), "custom_credit_days") or 0
		if so.get("customer")
		else 0
	)

	if grand_total > 0 and pending <= 0.01:
		status = "Paid"
	elif paid > 0:
		status = "Partially Paid"
	else:
		due_date = add_days(getdate(so.get("transaction_date")), int(credit_days or 0))
		status = "Overdue" if getdate(nowdate()) > due_date else "Pending Payment"

	return {
		"paid": paid,
		"pending": pending,
		"grand_total": grand_total,
		"payment_status": status,
		"credit_days": int(credit_days or 0),
		"currency": so.get("currency"),
	}


def _owned_order(sales_order):
	"""Return the SO if it belongs to the logged-in customer, else throw."""
	customer = get_current_customer()
	so = frappe.db.get_value(
		"Sales Order",
		sales_order,
		["name", "customer", "grand_total", "advance_paid", "currency", "transaction_date"],
		as_dict=True,
	)
	if not so:
		frappe.throw(_("Order not found."))
	if customer and so.customer != customer:
		frappe.throw(_("You are not allowed to pay for this order."), frappe.PermissionError)
	return so


@frappe.whitelist()
def create_order(sales_order):
	"""Create a Razorpay order for the outstanding amount of a Sales Order."""
	require_login()
	so = _owned_order(sales_order)
	info = get_order_payment_info(sales_order)
	pending = info["pending"]
	if pending <= 0:
		frappe.throw(_("This order is already fully paid."))

	key, secret = _razorpay_creds()
	amount_paise = int(round(pending * 100))

	resp = requests.post(
		f"{RAZORPAY_API}/orders",
		auth=(key, secret),
		json={
			"amount": amount_paise,
			"currency": so.currency or "INR",
			"receipt": so.name,
			"notes": {"sales_order": so.name, "site": APPROVED_SITE},
		},
		timeout=30,
	)
	if resp.status_code >= 400:
		frappe.log_error(resp.text, "Razorpay create_order failed")
		frappe.throw(_("Could not start payment. Please try again."))

	order = resp.json()
	frappe.db.set_value("Sales Order", so.name, "custom_razorpay_order_id", order["id"])
	frappe.db.commit()  # nosemgrep

	me = frappe.db.get_value("User", frappe.session.user, ["full_name", "mobile_no", "email"], as_dict=True) or {}
	return {
		"key_id": key,
		"razorpay_order_id": order["id"],
		"amount": amount_paise,
		"currency": so.currency or "INR",
		"sales_order": so.name,
		"name": "Purple Patch Farms",
		"prefill": {"name": me.get("full_name"), "email": me.get("email"), "contact": me.get("mobile_no")},
	}


@frappe.whitelist()
def create_payment_link(sales_order):
	"""Create a Razorpay Payment Link (hosted on Razorpay's domain).

	Used instead of the inline Checkout SDK so it works even when the PWA's
	domain isn't in the Razorpay account's registered websites.
	"""
	require_login()
	so = _owned_order(sales_order)
	info = get_order_payment_info(sales_order)
	pending = info["pending"]
	if pending <= 0:
		frappe.throw(_("This order is already fully paid."))

	key, secret = _razorpay_creds()
	amount_paise = int(round(pending * 100))
	me = frappe.db.get_value("User", frappe.session.user, ["full_name", "mobile_no", "email"], as_dict=True) or {}
	callback = get_url(f"/customer/orders?so={so.name}")

	payload = {
		"amount": amount_paise,
		"currency": so.currency or "INR",
		"accept_partial": False,
		"description": f"Order {so.name}",
		"customer": {
			"name": me.get("full_name") or so.customer,
			"contact": me.get("mobile_no") or "",
			"email": me.get("email") or "",
		},
		"notify": {"sms": False, "email": False},
		"reminder_enable": False,
		"notes": {"sales_order": so.name, "site": APPROVED_SITE},
		"callback_url": callback,
		"callback_method": "get",
	}
	resp = requests.post(f"{RAZORPAY_API}/payment_links", auth=(key, secret), json=payload, timeout=30)
	if resp.status_code >= 400:
		frappe.log_error(resp.text, "Razorpay create_payment_link failed")
		frappe.throw(_("Could not start payment. Please try again."))

	link = resp.json()
	frappe.db.set_value("Sales Order", so.name, "custom_razorpay_order_id", link.get("id"))
	frappe.db.commit()  # nosemgrep
	return {"short_url": link["short_url"], "sales_order": so.name}


@frappe.whitelist()
def verify_payment_link(
	sales_order,
	razorpay_payment_id,
	razorpay_payment_link_id,
	razorpay_payment_link_reference_id,
	razorpay_payment_link_status,
	razorpay_signature,
):
	"""Verify a Razorpay Payment Link redirect and record the payment."""
	require_login()
	so = _owned_order(sales_order)
	key, secret = _razorpay_creds()

	body = f"{razorpay_payment_link_id}|{razorpay_payment_link_reference_id}|{razorpay_payment_link_status}|{razorpay_payment_id}"
	expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
	if not hmac.compare_digest(expected, razorpay_signature):
		frappe.throw(_("Payment verification failed."))

	if razorpay_payment_link_status == "paid":
		info = get_order_payment_info(sales_order)
		_record_payment(so.name, amount=info["pending"], reference_no=razorpay_payment_id)

	return get_order_payment_info(sales_order)


def _record_payment(
	so_name, amount=None, reference_no=None, mode_of_payment="Razorpay", reference_date=None
):
	"""Create + submit a Payment Entry against a Sales Order (idempotent on reference_no).

	For Razorpay payments this records mode_of_payment="Razorpay", paid_to the
	"Razorpay - <abbr>" ledger, reference_no=<razorpay payment id>, reference_date.
	"""
	if reference_no:
		existing = frappe.db.get_value("Payment Entry", {"reference_no": reference_no, "docstatus": 1}, "name")
		if existing:
			return existing

	# Payments are triggered by website users / guest webhooks; elevate so the
	# Payment Entry (which reads Company/Account/GL) can be created + submitted.
	original_user = frappe.session.user
	if original_user != "Administrator":
		frappe.set_user("Administrator")

	try:
		from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

		pe = get_payment_entry("Sales Order", so_name, party_amount=amount, ignore_permissions=True)
		pe.reference_no = reference_no or so_name
		pe.reference_date = reference_date or nowdate()

		if mode_of_payment and frappe.db.exists("Mode of Payment", mode_of_payment):
			pe.mode_of_payment = mode_of_payment

		# Prefer the dedicated Razorpay ledger, then mode default, then any bank/cash.
		abbr = frappe.db.get_value("Company", pe.company, "abbr")
		preferred = f"Razorpay - {abbr}" if abbr else None
		if mode_of_payment == "Razorpay" and preferred and frappe.db.exists("Account", preferred):
			pe.paid_to = preferred
		if not pe.paid_to:
			pe.paid_to = frappe.db.get_value(
				"Account",
				{"company": pe.company, "account_type": ["in", ["Bank", "Cash"]], "is_group": 0},
				"name",
			)
		if pe.paid_to:
			pe.paid_to_account_currency = frappe.db.get_value("Account", pe.paid_to, "account_currency")

		pe.flags.ignore_permissions = True
		pe.insert(ignore_permissions=True)
		pe.submit()
		frappe.db.commit()  # nosemgrep
		pe_name = pe.name
		paid_amount = flt(pe.paid_amount) or amount
		ref = pe.reference_no
	finally:
		if original_user != "Administrator":
			frappe.set_user(original_user)

	# Payment-received WhatsApp (background; never blocks payment recording).
	frappe.enqueue(
		"ppf.api.notifications.send_payment_received",
		queue="short",
		sales_order=so_name,
		amount=paid_amount,
		reference=ref,
		payment_date=nowdate(),
		enqueue_after_commit=True,
	)
	return pe_name


@frappe.whitelist()
def verify_and_record(sales_order, razorpay_payment_id, razorpay_order_id, razorpay_signature):
	"""Verify the Razorpay signature and record a submitted Payment Entry."""
	require_login()
	so = _owned_order(sales_order)
	key, secret = _razorpay_creds()

	expected = hmac.new(
		secret.encode(), f"{razorpay_order_id}|{razorpay_payment_id}".encode(), hashlib.sha256
	).hexdigest()
	if not hmac.compare_digest(expected, razorpay_signature):
		frappe.throw(_("Payment verification failed."))

	info = get_order_payment_info(sales_order)
	pe = _record_payment(so.name, amount=info["pending"], reference_no=razorpay_payment_id)
	updated = get_order_payment_info(sales_order)
	updated["payment_entry"] = pe
	return updated


@frappe.whitelist(allow_guest=True)
def razorpay_webhook():
	"""Razorpay payment webhook → record the payment in ERPNext (idempotent).

	Set the webhook secret in site_config as `razorpay_webhook_secret`.
	"""
	raw = frappe.request.get_data()
	signature = frappe.get_request_header("X-Razorpay-Signature")
	secret = frappe.conf.get("razorpay_webhook_secret")

	if secret:
		expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
		if not signature or not hmac.compare_digest(expected, signature):
			frappe.throw(_("Invalid webhook signature."), frappe.PermissionError)

	# The request is signature-verified server-to-server; run as a privileged
	# user so the Payment Entry can be created (the request itself is Guest).
	frappe.set_user("Administrator")

	payload = json.loads(raw or b"{}")
	inner = payload.get("payload", {}) if isinstance(payload, dict) else {}
	entity = inner.get("payment", {}).get("entity", {})
	link_entity = inner.get("payment_link", {}).get("entity", {})

	payment_id = entity.get("id")
	notes = entity.get("notes") or link_entity.get("notes") or {}
	so_name = notes.get("sales_order")

	# Map back from a stored Razorpay order/link id if notes are missing.
	rzp_ref = entity.get("order_id") or link_entity.get("id")
	if not so_name and rzp_ref:
		so_name = frappe.db.get_value("Sales Order", {"custom_razorpay_order_id": rzp_ref}, "name")

	if so_name and payment_id and frappe.db.exists("Sales Order", so_name):
		amount = flt(entity.get("amount", 0)) / 100 or None
		ref_date = None
		if entity.get("created_at"):
			from datetime import datetime

			ref_date = datetime.fromtimestamp(int(entity["created_at"])).strftime("%Y-%m-%d")
		try:
			_record_payment(so_name, amount=amount, reference_no=payment_id, reference_date=ref_date)
		except Exception:
			frappe.log_error(frappe.get_traceback(), "Razorpay webhook record failed")

	return {"status": "ok"}
