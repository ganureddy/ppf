"""Idempotent demo data for the Purple Patch Farms customer PWA.

Run with:
    bench --site <site> execute ppf.demo.setup_demo

Creates sample produce items + prices, and a demo customer login linked to a
Customer/Contact so the /customer PWA can be exercised end to end.
"""

import frappe
from frappe.utils import add_days, nowdate
from frappe.utils.password import update_password

PRICE_LIST = "Standard Selling"
ITEM_GROUP = "Products"

SAMPLE_CUSTOMERS = [
	"Fruitbae Mysore",
	"Beyondburg INC Calicut",
	"Heavenly shack",
	"Brown Town Kannur Road",
	"HealthOji",
	"Burger Lounge Thrissur",
	"Burger Lounge Ettumanoor",
	"Spinners Mannar",
]

# (item_name, rate, display uom)
SAMPLE_ITEMS = [
	("Arugula (Rocket Lettuce)", 33.00, "1 EA"),
	("Asparagus", 50.00, "100 gm"),
	("Avocado", 200.00, "1 Kg"),
	("Baby Corn", 39.60, "1 EA"),
	("Basil", 32.00, "1 EA"),
	("Blackberry", 230.00, "1 EA"),
	("Bok Choy", 45.00, "1 EA"),
]

DEMO_USER = "customer@ppf.test"
DEMO_PASSWORD = "Customer@123"
DEMO_CUSTOMER = "Fruitbae Mysore"


def _ensure_uom(uom: str):
	if not frappe.db.exists("UOM", uom):
		frappe.get_doc({"doctype": "UOM", "uom_name": uom, "must_be_whole_number": 0}).insert(
			ignore_permissions=True
		)


def _ensure_item_group():
	if not frappe.db.exists("Item Group", ITEM_GROUP):
		frappe.get_doc(
			{
				"doctype": "Item Group",
				"item_group_name": ITEM_GROUP,
				"parent_item_group": "All Item Groups",
				"is_group": 0,
			}
		).insert(ignore_permissions=True)


def _ensure_item(item_name: str, rate: float, uom: str):
	_ensure_uom(uom)
	item_code = item_name
	if not frappe.db.exists("Item", item_code):
		frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": item_code,
				"item_name": item_name,
				"item_group": ITEM_GROUP,
				"stock_uom": uom,
				"is_sales_item": 1,
				"is_stock_item": 0,
				"disabled": 0,
			}
		).insert(ignore_permissions=True)

	existing_price = frappe.db.get_value(
		"Item Price", {"item_code": item_code, "price_list": PRICE_LIST}, "name"
	)
	if existing_price:
		frappe.db.set_value("Item Price", existing_price, "price_list_rate", rate)
	else:
		frappe.get_doc(
			{
				"doctype": "Item Price",
				"item_code": item_code,
				"price_list": PRICE_LIST,
				"uom": uom,
				"price_list_rate": rate,
				"selling": 1,
			}
		).insert(ignore_permissions=True)


def _ensure_customer_user():
	# Customer
	if not frappe.db.exists("Customer", DEMO_CUSTOMER):
		frappe.get_doc(
			{
				"doctype": "Customer",
				"customer_name": DEMO_CUSTOMER,
				"customer_type": "Company",
				"customer_group": frappe.db.get_value("Customer Group", {"is_group": 0}, "name")
				or "All Customer Groups",
				"territory": frappe.db.get_value("Territory", {"is_group": 0}, "name")
				or "All Territories",
			}
		).insert(ignore_permissions=True)

	# User
	if not frappe.db.exists("User", DEMO_USER):
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": DEMO_USER,
				"first_name": "Fruitbae",
				"last_name": "Mysore",
				"send_welcome_email": 0,
				"user_type": "Website User",
			}
		)
		user.insert(ignore_permissions=True)
	update_password(DEMO_USER, DEMO_PASSWORD)

	# Contact linking the user to the customer
	contact_name = frappe.db.get_value("Contact", {"user": DEMO_USER}, "name")
	if not contact_name:
		contact = frappe.get_doc(
			{
				"doctype": "Contact",
				"first_name": "Fruitbae",
				"last_name": "Mysore",
				"user": DEMO_USER,
				"email_ids": [{"email_id": DEMO_USER, "is_primary": 1}],
				"links": [{"link_doctype": "Customer", "link_name": DEMO_CUSTOMER}],
			}
		)
		contact.insert(ignore_permissions=True)


def _ensure_customer(name):
	if not frappe.db.exists("Customer", name):
		frappe.get_doc(
			{
				"doctype": "Customer",
				"customer_name": name,
				"customer_type": "Company",
				"customer_group": frappe.db.get_value("Customer Group", {"is_group": 0}, "name")
				or "All Customer Groups",
				"territory": frappe.db.get_value("Territory", {"is_group": 0}, "name")
				or "All Territories",
			}
		).insert(ignore_permissions=True)


def _company():
	return frappe.defaults.get_user_default("Company") or frappe.db.get_single_value(
		"Global Defaults", "default_company"
	)


def _ensure_sample_orders():
	"""Create a few submitted Sales Orders so the admin screens have data."""
	if frappe.db.count("Sales Order", {"docstatus": 1}) >= 4:
		return
	company = _company()
	items = [i[0] for i in SAMPLE_ITEMS]
	plan = [
		(SAMPLE_CUSTOMERS[0], [(items[0], 5), (items[1], 2)], 2),
		(SAMPLE_CUSTOMERS[1], [(items[2], 3)], 3),
		(SAMPLE_CUSTOMERS[2], [(items[3], 10), (items[4], 4)], 1),
		(SAMPLE_CUSTOMERS[4], [(items[5], 2), (items[6], 6)], 4),
	]
	for customer, lines, day_offset in plan:
		so = frappe.new_doc("Sales Order")
		so.customer = customer
		so.company = company
		so.transaction_date = nowdate()
		so.delivery_date = add_days(nowdate(), day_offset)
		so.order_type = "Sales"
		so.selling_price_list = PRICE_LIST
		for code, qty in lines:
			so.append(
				"items",
				{"item_code": code, "qty": qty, "delivery_date": add_days(nowdate(), day_offset)},
			)
		so.insert(ignore_permissions=True)
		so.submit()


def setup_demo():
	_ensure_item_group()
	for name, rate, uom in SAMPLE_ITEMS:
		_ensure_item(name, rate, uom)
	for c in SAMPLE_CUSTOMERS:
		_ensure_customer(c)
	_ensure_customer_user()
	_ensure_sample_orders()
	frappe.db.commit()  # nosemgrep
	print("Demo data ready.")
	print(f"  Items: {len(SAMPLE_ITEMS)}  Customers: {len(SAMPLE_CUSTOMERS)}")
	print(f"  Submitted Sales Orders: {frappe.db.count('Sales Order', {'docstatus': 1})}")
	print(f"  Customer login -> usr: {DEMO_USER}  pwd: {DEMO_PASSWORD}")
