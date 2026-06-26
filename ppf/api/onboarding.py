"""Customer onboarding: on first login (incl. Google social login) make sure
the logged-in website user is mapped to a Customer + Contact in ERPNext.

Wired via the ``on_session_creation`` hook so it runs for both password and
social logins, and is a no-op for staff/admin or already-linked customers.
"""

import frappe

from ppf.api.utils import get_current_customer


def ensure_customer_for_user(login_manager=None):
	try:
		_ensure()
	except Exception:
		# Never let onboarding break the login/session.
		frappe.log_error(frappe.get_traceback(), "PPF onboarding failed")


def _ensure():
	user = frappe.session.user
	if not user or user in ("Administrator", "Guest"):
		return

	# Only onboard customer-facing website users.
	user_type = frappe.db.get_value("User", user, "user_type")
	if user_type != "Website User":
		return

	if get_current_customer():
		return  # already linked

	u = (
		frappe.db.get_value(
			"User", user, ["full_name", "first_name", "last_name", "mobile_no", "email"], as_dict=True
		)
		or {}
	)
	full_name = u.get("full_name") or u.get("first_name") or user

	customer = frappe.get_doc(
		{
			"doctype": "Customer",
			"customer_name": full_name,
			"customer_type": "Individual",
			"customer_group": frappe.db.get_value("Customer Group", {"is_group": 0}, "name")
			or "All Customer Groups",
			"territory": frappe.db.get_value("Territory", {"is_group": 0}, "name")
			or "All Territories",
		}
	)
	if u.get("mobile_no"):
		customer.mobile_no = u.get("mobile_no")
	customer.flags.ignore_permissions = True
	customer.insert(ignore_permissions=True)

	contact = frappe.get_doc(
		{
			"doctype": "Contact",
			"first_name": u.get("first_name") or full_name,
			"last_name": u.get("last_name"),
			"user": user,
			"email_ids": [{"email_id": u.get("email") or user, "is_primary": 1}],
			"links": [{"link_doctype": "Customer", "link_name": customer.name}],
		}
	)
	if u.get("mobile_no"):
		contact.append("phone_nos", {"phone": u.get("mobile_no"), "is_primary_mobile_no": 1})
	contact.flags.ignore_permissions = True
	contact.insert(ignore_permissions=True)
	frappe.db.commit()  # nosemgrep
