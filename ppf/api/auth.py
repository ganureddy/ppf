import frappe

from ppf.api.utils import get_current_customer, require_login


@frappe.whitelist(allow_guest=True)
def google_login_url(redirect_to="/customer"):
	"""Return the Google OAuth2 authorize URL (same flow as Frappe's login page)."""
	from frappe.utils.oauth import get_oauth2_authorize_url

	return get_oauth2_authorize_url("google", redirect_to)


@frappe.whitelist(allow_guest=True)
def csrf():
	"""Return the current session's CSRF token.

	Lets the SPA obtain a valid token at runtime instead of depending on the
	server-rendered HTML shell (which a cached service worker could make stale).
	"""
	token = frappe.sessions.get_csrf_token()
	frappe.db.commit()  # nosemgrep — persist the freshly generated token
	return token


@frappe.whitelist()
def me():
	"""Return the logged-in user's profile for the customer PWA."""
	require_login()
	user = frappe.session.user

	user_doc = frappe.db.get_value(
		"User",
		user,
		["full_name", "first_name", "last_name", "username", "email", "mobile_no", "user_image"],
		as_dict=True,
	) or {}

	customer = get_current_customer()
	customer_name = None
	phone = None
	if customer:
		customer_doc = frappe.db.get_value(
			"Customer", customer, ["customer_name", "mobile_no"], as_dict=True
		) or {}
		customer_name = customer_doc.get("customer_name")
		phone = customer_doc.get("mobile_no")
	phone = phone or user_doc.get("mobile_no")

	display_name = customer_name or user_doc.get("full_name") or user_doc.get("username") or user

	# Onboarding is complete only when we have a linked customer + phone + address.
	from ppf.api.utils import get_primary_address

	has_address = bool(customer and get_primary_address(customer))
	onboarded = bool(customer and phone and has_address)

	return {
		"user": user,
		"name": display_name,
		"full_name": user_doc.get("full_name"),
		"username": user_doc.get("username"),
		"email": user_doc.get("email") or user,
		"phone": phone,
		"user_image": user_doc.get("user_image"),
		"customer": customer,
		"customer_name": customer_name,
		"has_address": has_address,
		"onboarded": onboarded,
	}
