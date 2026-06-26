import { OrderListScreen } from "@/components/OrderListScreen";
import { useBillNow } from "@/api/hooks";
import { frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";

export default function BillNow() {
	const billNow = useBillNow();
	const { push } = useToast();

	return (
		<OrderListScreen
			title="Bill Now"
			subtitle="Generate a Sales Invoice from a confirmed order."
			variant="bill"
			middleActionFor={(order, { refetch }) => ({
				label: "Bill Now",
				loading: billNow.isPending && billNow.variables === order.name,
				onClick: async () => {
					try {
						const res = await billNow.mutateAsync(order.name);
						if (res.submitted) {
							push(`Invoice ${res.sales_invoice} created`);
						} else {
							push(`Draft invoice ${res.sales_invoice} created (review in ERPNext)`, "error");
						}
						refetch();
					} catch (e) {
						push(frappeError(e, "Could not create invoice"), "error");
					}
				},
			})}
		/>
	);
}
