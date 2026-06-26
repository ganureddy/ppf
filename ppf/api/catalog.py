import frappe

from ppf.api.utils import (
	get_default_currency,
	get_default_selling_price_list,
	require_login,
)


@frappe.whitelist()
def list_products(search=None, limit=200):
	"""Return sellable items with their selling rate, UOM and published stock.

	Shape: [{item_code, item_name, item_group, uom, rate, currency, image,
	         published_stock}]
	"""
	require_login()

	filters = {"disabled": 0, "is_sales_item": 1}
	if search:
		filters["item_name"] = ["like", f"%{search}%"]

	items = frappe.get_all(
		"Item",
		filters=filters,
		fields=["item_code", "item_name", "item_group", "stock_uom", "image"],
		order_by="item_name asc",
		limit_page_length=int(limit or 200),
	)

	if not items:
		return []

	price_list = get_default_selling_price_list()
	currency = get_default_currency()
	item_codes = [it["item_code"] for it in items]

	# Rates keyed by item_code (latest valid price wins).
	rates = {}
	if price_list:
		price_rows = frappe.get_all(
			"Item Price",
			filters={"price_list": price_list, "item_code": ["in", item_codes]},
			fields=["item_code", "price_list_rate", "uom", "currency"],
			order_by="valid_from desc",
		)
		for row in price_rows:
			if row["item_code"] not in rates:
				rates[row["item_code"]] = row

	has_published = frappe.db.has_column("Item", "custom_published_stock")

	result = []
	for it in items:
		price = rates.get(it["item_code"], {})
		published_stock = None
		if has_published:
			published_stock = frappe.db.get_value(
				"Item", it["item_code"], "custom_published_stock"
			)
		result.append(
			{
				"item_code": it["item_code"],
				"item_name": it["item_name"],
				"item_group": it["item_group"],
				"uom": price.get("uom") or it["stock_uom"],
				"rate": price.get("price_list_rate") or 0,
				"currency": price.get("currency") or currency,
				"image": it["image"],
				"published_stock": published_stock,
			}
		)
	return result
