import { useNavigate } from "react-router-dom";
import { useCart } from "@/api/hooks";
import { CartIcon, ChevronRightIcon } from "./icons";

export function CartBar() {
	const navigate = useNavigate();
	const { data: cart } = useCart();
	const count = cart?.item_count ?? 0;
	if (!count) return null;
	return (
		<button
			onClick={() => navigate("/cart")}
			className="mx-3 mb-2 flex items-center justify-between rounded-full bg-ppf-mint px-5 py-3 text-ppf-green shadow-card"
		>
			<span className="flex items-center gap-2 font-semibold">
				<CartIcon width={20} height={20} />
				<span className="text-ppf-green/40">|</span>
				{count} {count === 1 ? "item" : "items"}
			</span>
			<span className="flex items-center gap-1 font-semibold">
				View Cart <ChevronRightIcon width={18} height={18} />
			</span>
		</button>
	);
}
