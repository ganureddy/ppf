import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const ICON_BASE = "/assets/ppf/customer";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: null, // we register manually in src/pwa.ts
			// The service worker is served from the site root (/customer-sw.js)
			// so it can own the "/customer" scope; see scripts/postbuild.mjs.
			manifest: {
				name: "Purple Patch Farms",
				short_name: "PPF",
				description: "Purple Patch Farms — fresh produce ordering.",
				id: "/customer",
				start_url: "/customer",
				scope: "/customer",
				display: "standalone",
				background_color: "#FFFFFF",
				theme_color: "#6B1170",
				icons: [
					{ src: `${ICON_BASE}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
					{ src: `${ICON_BASE}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
					{ src: `${ICON_BASE}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
				],
			},
			workbox: {
				inlineWorkboxRuntime: true,
				clientsClaim: true,
				skipWaiting: true,
				cleanupOutdatedCaches: true,
				// Only cache static assets. Never precache/serve the HTML shell:
				// it must always be rendered by Frappe so the CSRF token and boot
				// data are injected fresh (a cached shell breaks cart POSTs).
				globPatterns: ["**/*.{js,css,svg,png,ico,woff2}"],
				globIgnores: ["**/index.html", "**/*.html"],
				runtimeCaching: [
					{
						urlPattern: ({ url }) =>
							url.pathname.startsWith("/api/method/ppf.api.catalog"),
						handler: "StaleWhileRevalidate",
						options: { cacheName: "ppf-catalog" },
					},
				],
			},
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 8081,
		proxy: {
			"^/(api|files|assets|private)": {
				target: "http://127.0.0.1:8000",
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: "../ppf/public/customer",
		emptyOutDir: true,
		target: "es2018",
		sourcemap: false,
	},
});
