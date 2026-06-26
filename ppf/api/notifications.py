"""WhatsApp (WATI) notifications + custom HTML→PDF generation.

PDFs are rendered from our own HTML (not an ERPNext print format), saved as a
public File attached to the order, and the public URL is sent over WhatsApp.

WATI credentials are read from the `WATI Setting` single doctype
(url, token, whatsapp_number) with a site_config fallback. Everything is
defensive: a misconfiguration or network error is logged and never breaks
order placement or payment recording.
"""

import frappe
import requests
from frappe.utils import flt, format_date, get_url
from frappe.utils.pdf import get_pdf

LOGO = "https://ppf.emrid.store/files/172355246554z5jjLtKL.png"


# ---------------------------------------------------------------------------
# WATI
# ---------------------------------------------------------------------------
def _wati_cfg():
	# Read single values directly (avoids depending on the WATI Setting
	# controller module being importable on this site).
	url = token = channel = None
	try:
		url = (frappe.db.get_single_value("WATI Setting", "url") or "").strip().rstrip("/")
		token = (frappe.db.get_single_value("WATI Setting", "token") or "").strip()
		channel = (frappe.db.get_single_value("WATI Setting", "whatsapp_number") or "").strip()
	except Exception:
		pass
	url = url or (frappe.conf.get("wati_url") or "").rstrip("/")
	token = token or frappe.conf.get("wati_token")
	channel = channel or frappe.conf.get("wati_channel_number")
	return url, token, channel


def resolve_customer_mobile(customer_name):
	"""Find a usable mobile for a customer: Customer → linked Contact → that Contact's user."""
	if not customer_name:
		return None
	m = frappe.db.get_value("Customer", customer_name, "mobile_no")
	if m:
		return m
	contact = frappe.db.get_value(
		"Dynamic Link",
		{"link_doctype": "Customer", "link_name": customer_name, "parenttype": "Contact"},
		"parent",
	)
	if contact:
		cd = frappe.db.get_value("Contact", contact, ["mobile_no", "user"], as_dict=True) or {}
		if cd.get("mobile_no"):
			return cd["mobile_no"]
		ph = frappe.db.get_value("Contact Phone", {"parent": contact}, "phone")
		if ph:
			return ph
		if cd.get("user"):
			um = frappe.db.get_value("User", cd["user"], "mobile_no")
			if um:
				return um
	return None


def normalize_mobile(num):
	if not num:
		return None
	digits = "".join(ch for ch in str(num) if ch.isdigit())
	if len(digits) == 10:
		digits = "91" + digits
	return digits or None


def send_template(mobile, template_name, parameters, broadcast_name=None):
	"""Send a WATI template message. Returns a small status dict; never raises."""
	url, token, channel = _wati_cfg()
	mobile = normalize_mobile(mobile)
	if not (url and token and mobile):
		frappe.log_error(
			f"WATI not configured or missing mobile (template={template_name}, mobile={mobile})",
			"WATI: skipped",
		)
		return {"sent": False, "reason": "not configured or no mobile"}

	endpoint = f"{url}/api/v2/sendTemplateMessage?whatsappNumber={mobile}"
	payload = {
		"template_name": template_name,
		"broadcast_name": broadcast_name or template_name,
		"parameters": parameters,
	}
	if channel:
		payload["channel_number"] = channel

	try:
		resp = requests.post(
			endpoint,
			json=payload,
			headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
			timeout=30,
		)
		if resp.status_code != 200:
			frappe.log_error(f"{resp.status_code}: {resp.text}", f"WATI {template_name} failed")
			return {"sent": False, "status": resp.status_code}
		return {"sent": True, "status": 200}
	except Exception:
		frappe.log_error(frappe.get_traceback(), f"WATI {template_name} error")
		return {"sent": False, "reason": "exception"}


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------
def _save_public_pdf(html, filename, attached_to_dt, attached_to_dn):
	pdf = get_pdf(html)
	existing = frappe.db.get_value(
		"File", {"file_name": filename, "attached_to_name": attached_to_dn}, "name"
	)
	if existing:
		frappe.delete_doc("File", existing, ignore_permissions=True, force=True)
	f = frappe.get_doc(
		{
			"doctype": "File",
			"file_name": filename,
			"is_private": 0,
			"content": pdf,
			"attached_to_doctype": attached_to_dt,
			"attached_to_name": attached_to_dn,
		}
	)
	f.insert(ignore_permissions=True)
	frappe.db.commit()  # nosemgrep
	return get_url(f.file_url)


def _doc_shell(title, company, cust, meta_html, rows_html, total_label, total_value):
	addr = _customer_address_text(cust.name)
	mobile = resolve_customer_mobile(cust.name)
	return f"""
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page{{margin:0}}
body{{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;margin:0;font-size:13px}}
.wrap{{padding:0 0 24px 0}}
.band{{background:#6B1170;color:#fff;padding:22px 32px}}
.band table{{width:100%}}
.logo{{width:58px;height:58px;border-radius:50%;background:#fff;padding:3px;vertical-align:middle}}
.brand{{font-size:22px;font-weight:bold;letter-spacing:.3px}}
.brand-sub{{font-size:11px;opacity:.85}}
.doctitle{{text-align:right;font-size:20px;font-weight:bold;text-transform:uppercase;letter-spacing:2px}}
.content{{padding:24px 32px}}
.cols{{width:100%}}
.cols td{{vertical-align:top;width:50%}}
.lbl{{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px}}
.party{{font-weight:bold;color:#1A1A1A;font-size:14px}}
.muted{{color:#666;line-height:1.5}}
table.items{{width:100%;border-collapse:collapse;margin-top:18px}}
table.items th{{background:#F3E9F5;color:#4A0A52;text-align:left;padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:.5px}}
table.items td{{padding:10px;border-bottom:1px solid #eee}}
table.items tr:nth-child(even) td{{background:#FAF8FB}}
.totbox{{margin-top:18px;width:100%}}
.totbox td{{padding:6px 10px}}
.totbox .tot-row td{{border-top:2px solid #6B1170;font-size:17px;font-weight:bold;color:#6B1170}}
.foot{{margin-top:30px;border-top:1px solid #eee;padding-top:12px;color:#999;font-size:11px;text-align:center}}
.right{{text-align:right}}
</style></head><body><div class="wrap">
<div class="band"><table><tr>
  <td style="width:70px"><img class="logo" src="{LOGO}"></td>
  <td><div class="brand">{company}</div><div class="brand-sub">Purple Patch Farms · Fresh from the farm</div></td>
  <td class="doctitle">{title}</td>
</tr></table></div>
<div class="content">
<table class="cols"><tr>
  <td><div class="lbl">Billed To</div>
    <div class="party">{cust.customer_name}</div>
    <div class="muted">{("Phone: " + mobile + "<br>") if mobile else ""}{addr}</div></td>
  <td class="right">{meta_html}</td>
</tr></table>
{rows_html}
<table class="totbox"><tr class="tot-row"><td>{total_label}</td><td class="right">{total_value}</td></tr></table>
<div class="foot">Thank you for choosing {company}. · This is a computer-generated document.</div>
</div>
</div></body></html>"""


def _customer_address_text(customer):
	addr_name = frappe.db.get_value(
		"Dynamic Link",
		{"link_doctype": "Customer", "link_name": customer, "parenttype": "Address"},
		"parent",
	)
	if not addr_name:
		return ""
	a = frappe.db.get_value(
		"Address",
		addr_name,
		["address_line1", "address_line2", "city", "state", "pincode"],
		as_dict=True,
	)
	if not a:
		return ""
	parts = [a.address_line1, a.address_line2, a.city, a.state, a.pincode]
	return ", ".join([p for p in parts if p])


def _money(amount):
	return f"₹{flt(amount):,.2f}"


def order_pdf_html(so, cust):
	items = frappe.get_all(
		"Sales Order Item",
		filters={"parent": so.name},
		fields=["item_name", "qty", "uom", "rate", "amount"],
		order_by="idx asc",
	)
	rows = "".join(
		f"<tr><td>{i.item_name}</td><td>{i.qty:g} {i.uom}</td>"
		f"<td class='right'>{_money(i.rate)}</td><td class='right'>{_money(i.amount)}</td></tr>"
		for i in items
	)
	meta = (
		f"<div class='lbl'>Order</div><div class='party'>{so.name}</div>"
		f"<div class='muted'>Date: {format_date(so.transaction_date)}<br>"
		f"Delivery: {format_date(so.delivery_date)}</div>"
	)
	table = (
		"<table class='items'><tr><th>Item</th><th>Qty</th><th class='right'>Rate</th>"
		f"<th class='right'>Amount</th></tr>{rows}</table>"
	)
	return _doc_shell("Invoice", so.company, cust, meta, table, "Total", _money(so.grand_total))


def receipt_pdf_html(so, cust, amount, reference, payment_date):
	meta = (
		f"<div class='lbl'>Receipt For</div><div class='party'>{so.name}</div>"
		f"<div class='muted'>Date: {format_date(payment_date)}</div>"
	)
	body = (
		"<table class='items'>"
		f"<tr><td>Order Number</td><td class='right'>{so.name}</td></tr>"
		f"<tr><td>Payment Date</td><td class='right'>{format_date(payment_date)}</td></tr>"
		f"<tr><td>Transaction Reference</td><td class='right'>{reference}</td></tr>"
		f"<tr><td>Order Amount</td><td class='right'>{_money(so.grand_total)}</td></tr>"
		"</table>"
	)
	return _doc_shell("Receipt", so.company, cust, meta, body, "Amount Paid", _money(amount))


# ---------------------------------------------------------------------------
# High-level senders (call via enqueue)
# ---------------------------------------------------------------------------
def send_order_confirmation(sales_order):
	try:
		so = frappe.get_doc("Sales Order", sales_order)
		cust = frappe.get_doc("Customer", so.customer)
		_save_public_pdf(order_pdf_html(so, cust), f"Order-{so.name}.pdf", "Sales Order", so.name)
		params = [
			{"name": "1", "value": cust.customer_name},
			{"name": "2", "value": so.company},
			{"name": "3", "value": so.name},
			{"name": "4", "value": format_date(so.transaction_date)},
			{"name": "5", "value": f"{flt(so.grand_total):,.2f}"},
		]
		return send_template(resolve_customer_mobile(cust.name), "order_confirmation", params)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "send_order_confirmation failed")


def send_payment_received(sales_order, amount, reference, payment_date):
	try:
		so = frappe.get_doc("Sales Order", sales_order)
		cust = frappe.get_doc("Customer", so.customer)
		url = _save_public_pdf(
			receipt_pdf_html(so, cust, amount, reference, payment_date),
			f"Receipt-{reference}.pdf",
			"Sales Order",
			so.name,
		)
		params = [
			{"name": "1", "value": cust.customer_name},
			{"name": "2", "value": so.name},
			{"name": "3", "value": f"{flt(amount):,.2f}"},
			{"name": "4", "value": format_date(payment_date)},
			{"name": "5", "value": str(reference)},
			{"name": "6", "value": url},
		]
		return send_template(resolve_customer_mobile(cust.name), "payment_received_ppf", params)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "send_payment_received failed")
