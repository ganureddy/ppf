// The service worker is served from the site root as /customer-sw.js (see
// scripts/postbuild.mjs). Serving it from "/" lets it claim the "/customer"
// scope, which contains the manifest start_url and so makes the app
// installable and able to control every /customer route.
const SW_URL = "/customer-sw.js";

export function registerSW(): void {
	if (!("serviceWorker" in navigator)) return;
	if (import.meta.env.DEV) return;
	window.addEventListener("load", async () => {
		try {
			// Remove any stale service workers from earlier deploys (e.g. one that
			// was registered at /customer/sw.js) so they can't serve a broken shell.
			const regs = await navigator.serviceWorker.getRegistrations();
			await Promise.all(
				regs
					.filter((r) => !r.active || !r.active.scriptURL.endsWith(SW_URL))
					.map((r) => r.unregister()),
			);

			const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/customer" });
			// Activate updated workers immediately and reload once so users always
			// get the latest shell instead of a cached old one.
			reg.addEventListener("updatefound", () => {
				const installing = reg.installing;
				if (!installing) return;
				installing.addEventListener("statechange", () => {
					if (installing.state === "activated" && navigator.serviceWorker.controller) {
						// a new version took over
					}
				});
			});
		} catch (err) {
			console.warn("[pwa] SW registration failed", err);
		}
	});
}
