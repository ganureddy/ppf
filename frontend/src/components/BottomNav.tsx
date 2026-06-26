import { NavLink } from "react-router-dom";
import { useCart } from "@/api/hooks";
import { BagIcon, CartIcon, HeartIcon, HomeIcon, UserIcon } from "./icons";

const itemCls = ({ isActive }: { isActive: boolean }) =>
	`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
		isActive ? "text-ppf-green" : "text-ppf-muted"
	}`;

export function BottomNav() {
	const { data: cart } = useCart();
	const count = cart?.item_count ?? 0;

	return (
		<nav
			className="sticky bottom-0 z-30 flex border-t border-ppf-border bg-white"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			<NavLink to="/" end className={itemCls}>
				<HomeIcon width={22} height={22} />
				Home
			</NavLink>
			<NavLink to="/orders" className={itemCls}>
				<BagIcon width={22} height={22} />
				Orders
			</NavLink>
			<NavLink to="/cart" className={itemCls}>
				<span className="relative">
					<CartIcon width={22} height={22} />
					{count > 0 && (
						<span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ppf-green px-1 text-[9px] font-bold text-white">
							{count}
						</span>
					)}
				</span>
				My Basket
			</NavLink>
			<NavLink to="/saved" className={itemCls}>
				<HeartIcon width={22} height={22} />
				Saved
			</NavLink>
			<NavLink to="/profile" className={itemCls}>
				<UserIcon width={22} height={22} />
				Profile
			</NavLink>
		</nav>
	);
}
