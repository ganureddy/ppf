import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const ICON_BASE = "/assets/ppf/admin";

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: null, // registered manually in src/pwa.ts
			// SW is served from the site root (/admin-sw.js) so it can claim the
			// "/admin" scope; see scripts/postbuild.mjs.
			manifest: {
				name: "Purple Patch Farms Admin",
				short_name: "PPF Admin",
				description: "Purple Patch Farms — admin console.",
				id: "/admin",
				start_url: "/admin",
				scope: "/admin",
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
				// Only cache static assets; the HTML shell must always be rendered
				// by Frappe so CSRF/boot are injected fresh.
				globPatterns: ["**/*.{js,css,svg,png,ico,woff2}"],
				globIgnores: ["**/index.html", "**/*.html"],
			},
		}),
	],
	resolve: {
		alias: { "@": path.resolve(__dirname, "./src") },
	},
	server: {
		port: 8082,
		proxy: {
			"^/(api|files|assets|private)": {
				target: "http://127.0.0.1:8000",
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: "../ppf/public/admin",
		emptyOutDir: true,
		target: "es2018",
		sourcemap: false,
	},
});
