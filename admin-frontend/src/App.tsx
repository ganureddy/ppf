import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useMe } from "@/api/hooks";
import { Loading } from "@/components/EmptyState";
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/Toaster";
import Login from "@/pages/Login";

// Lazy-load route pages so the initial bundle stays small (Recharts and the
// report/dashboard screens load on demand) — keeps first paint fast on mobile.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ManageOrders = lazy(() => import("@/pages/ManageOrders"));
const BillNow = lazy(() => import("@/pages/BillNow"));
const Shipment = lazy(() => import("@/pages/Shipment"));
const Products = lazy(() => import("@/pages/Products"));
const Customers = lazy(() => import("@/pages/Customers"));
const Insights = lazy(() => import("@/pages/Insights"));
const Report = lazy(() => import("@/pages/Report"));
const ProductSales = lazy(() => import("@/pages/ProductSales"));
const Settings = lazy(() => import("@/pages/Settings"));
const TallyIntegration = lazy(() => import("@/pages/TallyIntegration"));

function RequireAuth({ children }: { children: React.ReactNode }) {
	const { data, isLoading, isError } = useMe();
	if (isLoading) return <Loading />;
	if (isError || !data) return <Navigate to="/login" replace />;
	return <>{children}</>;
}

export default function App() {
	return (
		<>
			<Toaster />
			<Suspense fallback={<Loading />}>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route
						element={
							<RequireAuth>
								<Layout />
							</RequireAuth>
						}
					>
						<Route path="/" element={<Dashboard />} />
						<Route path="/orders" element={<ManageOrders />} />
						<Route path="/bill-now" element={<BillNow />} />
						<Route path="/shipment" element={<Shipment />} />
						<Route path="/invoice" element={<ManageOrders />} />
						<Route path="/products" element={<Products />} />
						<Route path="/customers" element={<Customers />} />
						<Route path="/insights" element={<Insights />} />
						<Route path="/report" element={<Report />} />
						<Route path="/product-sales" element={<ProductSales />} />
						<Route path="/settings" element={<Settings />} />
						<Route path="/tally" element={<TallyIntegration />} />
					</Route>
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Suspense>
		</>
	);
}
