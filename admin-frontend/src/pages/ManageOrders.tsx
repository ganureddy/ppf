import { OrderListScreen } from "@/components/OrderListScreen";
import { api, frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";

export default function ManageOrders() {
	const { push } = useToast();

	return (
		<OrderListScreen
			title="Manage Orders"
			subtitle="Track fulfilment, edit lines and record payments."
			variant="manage"
			middleActionFor={(order, { refetch }) => ({
				label: "Delete",
				onClick: async () => {
					if (!window.confirm(`Delete order ${order.name}? Submitted orders must be cancelled in ERPNext first.`)) {
						return;
					}
					try {
						await api.delete(`/api/resource/Sales Order/${encodeURIComponent(order.name)}`);
						push(`Deleted ${order.name}`);
						refetch();
					} catch (e) {
						push(frappeError(e, "Could not delete this order"), "error");
					}
				},
			})}
		/>
	);
}
