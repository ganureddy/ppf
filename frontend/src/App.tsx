import { Navigate, Route, Routes } from "react-router-dom";
import { useMe } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/Toaster";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import Saved from "@/pages/Saved";
import Bills from "@/pages/Bills";
import Orders from "@/pages/Orders";
import OrderTracking from "@/pages/OrderTracking";
import Insights from "@/pages/Insights";
import Profile from "@/pages/Profile";
import ProfileEdit from "@/pages/ProfileEdit";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";

function RequireAuth({ children }: { children: React.ReactNode }) {
	const { data, isLoading, isError } = useMe();
	if (isLoading) return <Loading />;
	if (isError || !data) return <Navigate to="/login" replace />;
	// First-time users must complete phone + address before using the app.
	// Gate only when the backend explicitly reports not-onboarded (avoids
	// blocking users before the updated backend is loaded).
	if (data.customer && data.onboarded === false) return <Onboarding />;
	return <>{children}</>;
}

export default function App() {
	return (
		<>
			<Toaster />
			<Routes>
				<Route path="/login" element={<Login />} />
				<Route
					element={
						<RequireAuth>
							<AppShell />
						</RequireAuth>
					}
				>
					<Route path="/" element={<Home />} />
					<Route path="/catalog" element={<Catalog />} />
					<Route path="/search" element={<Navigate to="/catalog" replace />} />
					<Route path="/saved" element={<Saved />} />
					<Route path="/cart" element={<Cart />} />
					<Route path="/checkout" element={<Checkout />} />
					<Route path="/orders" element={<Orders />} />
					<Route path="/orders/:name" element={<OrderTracking />} />
					<Route path="/bills" element={<Bills />} />
					<Route path="/insights" element={<Insights />} />
					<Route path="/profile" element={<Profile />} />
					<Route path="/profile/edit" element={<ProfileEdit />} />
				</Route>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</>
	);
}
