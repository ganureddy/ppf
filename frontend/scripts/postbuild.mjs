// Post-build: wire the Vite output into Frappe's website serving.
//  1. Copy the built index.html -> www/customer.html (the SPA shell that
//     Frappe renders at /customer, injecting csrf/boot).
//  2. Copy the generated service worker to www/customer-sw.js so it is served
//     from the site root (/customer-sw.js) and can claim the /customer scope.
import { copyFileSync, existsSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = join(__dirname, "../../ppf/public/customer");
const wwwDir = join(__dirname, "../../ppf/www");

if (!existsSync(buildDir)) {
	console.error(`[postbuild] build dir not found: ${buildDir}`);
	process.exit(1);
}

// 1) SPA shell
copyFileSync(join(buildDir, "index.html"), join(wwwDir, "customer.html"));
console.log("[postbuild] index.html -> www/customer.html");

// 2) Service worker served at the site root as /customer-sw.js
//    (inlineWorkboxRuntime keeps everything in this single file).
for (const f of readdirSync(buildDir)) {
	if (f === "sw.js") {
		copyFileSync(join(buildDir, f), join(wwwDir, "customer-sw.js"));
		console.log(`[postbuild] ${f} -> www/customer-sw.js`);
	}
}
