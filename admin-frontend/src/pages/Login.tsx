import { useState } from "react";
import { frappeError, login } from "@/lib/api";
import { Spinner } from "@/components/EmptyState";

const LOGO = "https://ppf.emrid.store/files/172355246554z5jjLtKL.png";

export default function Login() {
	const [usr, setUsr] = useState("");
	const [pwd, setPwd] = useState("");
	const [show, setShow] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!usr || !pwd) return;
		setLoading(true);
		setError("");
		try {
			await login(usr, pwd);
			window.location.assign("/admin");
		} catch (err) {
			setError(frappeError(err, "Incorrect username or password."));
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-full flex-col bg-white">
			<div className="bg-gradient-to-b from-ppf-purple-deep to-ppf-purple px-6 pb-10 pt-16 text-center text-white">
				<img src={LOGO} alt="Purple Patch Farms" className="mx-auto h-20 w-20 rounded-full bg-white object-contain p-1 shadow-lg" />
				<h1 className="mt-4 text-2xl font-bold">Purple Patch Farms</h1>
				<p className="mt-1 text-sm text-white/80">Admin Console</p>
			</div>

			<form onSubmit={onSubmit} className="mx-auto w-full max-w-[420px] flex-1 px-6 py-8">
				<label className="mb-1 block text-sm font-medium text-ppf-text">Username / Email</label>
				<input
					type="text"
					autoCapitalize="none"
					autoComplete="username"
					value={usr}
					onChange={(e) => setUsr(e.target.value)}
					placeholder="admin@example.com"
					className="mb-4 w-full rounded-xl border border-black/10 bg-ppf-bg px-4 py-3 outline-none focus:border-ppf-purple"
				/>

				<label className="mb-1 block text-sm font-medium text-ppf-text">Password</label>
				<div className="relative mb-2">
					<input
						type={show ? "text" : "password"}
						autoComplete="current-password"
						value={pwd}
						onChange={(e) => setPwd(e.target.value)}
						placeholder="••••••••"
						className="w-full rounded-xl border border-black/10 bg-ppf-bg px-4 py-3 pr-16 outline-none focus:border-ppf-purple"
					/>
					<button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ppf-purple">
						{show ? "Hide" : "Show"}
					</button>
				</div>

				{error && <p className="mb-2 rounded-lg bg-ppf-danger/10 px-3 py-2 text-sm text-ppf-danger">{error}</p>}

				<button type="submit" disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ppf-purple py-3 font-semibold text-white disabled:opacity-60">
					{loading ? <Spinner className="border-white/40 border-t-white" /> : "Login"}
				</button>
			</form>
		</div>
	);
}
