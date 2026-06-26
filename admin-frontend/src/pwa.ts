// SW served from the site root as /admin-sw.js (see scripts/postbuild.mjs) so
// it can claim the "/admin" scope that contains the manifest start_url.
const SW_URL = "/admin-sw.js";

export function registerSW(): void {
	if (!("serviceWorker" in navigator)) return;
	if (import.meta.env.DEV) return;
	window.addEventListener("load", async () => {
		try {
			const regs = await navigator.serviceWorker.getRegistrations();
			await Promise.all(
				regs
					.filter((r) => !r.active || !r.active.scriptURL.endsWith(SW_URL))
					.map((r) => r.unregister()),
			);
			await navigator.serviceWorker.register(SW_URL, { scope: "/admin" });
		} catch (err) {
			console.warn("[pwa] SW registration failed", err);
		}
	});
}
