import { useState } from "react";
import { frappeError, login } from "@/lib/api";
import { Spinner } from "@/components/EmptyState";

const LOGO = "https://ppf.emrid.store/files/172355246554z5jjLtKL.png";

// Google OAuth (mirrors the Frappe Social Login Key for this site).
const GOOGLE_CLIENT_ID =
	"564320478191-5o5879p2tjte13g9k5a9br13n2jqt2mh.apps.googleusercontent.com";
const GOOGLE_SCOPE =
	"https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";

function startGoogleLogin() {
	const origin = window.location.origin;
	const redirectUri = `${origin}/api/method/frappe.integrations.oauth2_logins.login_via_google`;
	const state = btoa(
		JSON.stringify({
			site: origin,
			token: `${Math.random().toString(36).slice(2)}${Date.now()}`,
			redirect_to: "/customer",
		}),
	);
	const url =
		"https://accounts.google.com/o/oauth2/auth?" +
		`client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
		`&redirect_uri=${encodeURIComponent(redirectUri)}` +
		"&response_type=code" +
		`&scope=${encodeURIComponent(GOOGLE_SCOPE)}` +
		`&state=${encodeURIComponent(state)}`;
	window.location.href = url;
}

export default function Login() {
	const [usr, setUsr] = useState("");
	const [pwd, setPwd] = useState("");
	const [show, setShow] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	function googleLogin() {
		setError("");
		startGoogleLogin();
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!usr || !pwd) return;
		setLoading(true);
		setError("");
		try {
			await login(usr, pwd);
			window.location.assign("/customer");
		} catch (err) {
			setError(
				frappeError(err, "Incorrect username or password. Please contact us for the correct credentials."),
			);
			setLoading(false);
		}
	}

	const field =
		"w-full rounded-xl border border-ppf-border bg-ppf-input px-11 py-3.5 text-ppf-text outline-none focus:border-ppf-green focus:bg-white";

	return (
		<div className="flex min-h-full flex-col bg-white">
			{/* Hero */}
			<div className="relative h-64 overflow-hidden bg-gradient-to-br from-ppf-green-deep via-[#0EB50E] to-ppf-green">
				<div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, #fff 0, transparent 40%)" }} />
				<div className="absolute left-1/2 top-7 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 shadow">
					<img src={LOGO} alt="" className="h-6 w-6 rounded-full object-contain" />
					<span className="font-bold text-ppf-text">Purple Patch Farms</span>
				</div>
			</div>

			{/* Card */}
			<div className="-mt-8 flex-1 rounded-t-3xl bg-white px-6 pt-8">
				<h1 className="text-3xl font-bold text-ppf-text">Welcome Back!</h1>
				<p className="mt-1 text-ppf-subtext">Freshness awaits. Sign in to continue.</p>

				<form onSubmit={onSubmit} className="mt-7">
					<label className="mb-1.5 block text-sm font-medium text-ppf-text">Email or Username</label>
					<div className="relative mb-4">
						<span className="absolute left-4 top-1/2 -translate-y-1/2 text-ppf-muted">✉</span>
						<input
							type="text"
							autoCapitalize="none"
							autoComplete="username"
							value={usr}
							onChange={(e) => setUsr(e.target.value)}
							placeholder="your@email.com"
							className={field}
						/>
					</div>

					<label className="mb-1.5 block text-sm font-medium text-ppf-text">Password</label>
					<div className="relative">
						<span className="absolute left-4 top-1/2 -translate-y-1/2 text-ppf-muted">🔒</span>
						<input
							type={show ? "text" : "password"}
							autoComplete="current-password"
							value={pwd}
							onChange={(e) => setPwd(e.target.value)}
							placeholder="••••••••"
							className={`${field} pr-12`}
						/>
						<button
							type="button"
							onClick={() => setShow((s) => !s)}
							className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ppf-green"
						>
							{show ? "Hide" : "Show"}
						</button>
					</div>

					{error && (
						<p className="mt-3 rounded-lg bg-ppf-danger/10 px-3 py-2 text-sm text-ppf-danger">{error}</p>
					)}

					<button
						type="submit"
						disabled={loading}
						className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-ppf-green py-4 text-lg font-bold text-white shadow-glow disabled:opacity-60"
					>
						{loading ? <Spinner className="border-ppf-text/30 border-t-ppf-text" /> : "Login →"}
					</button>

					<div className="my-5 flex items-center gap-3 text-xs text-ppf-muted">
						<span className="h-px flex-1 bg-ppf-border" />
						Or continue with
						<span className="h-px flex-1 bg-ppf-border" />
					</div>

					<button
						type="button"
						onClick={googleLogin}
						className="flex w-full items-center justify-center gap-3 rounded-2xl border border-ppf-border bg-white py-3.5 font-semibold text-ppf-text"
					>
						<img src="https://www.google.com/favicon.ico" alt="" className="h-5 w-5" />
						Continue with Google
					</button>

					<p className="mt-6 text-center text-xs text-ppf-subtext">
						Accounts are managed by our team. If you can't sign in, please contact us for the
						correct credentials.
					</p>
				</form>
			</div>
		</div>
	);
}
