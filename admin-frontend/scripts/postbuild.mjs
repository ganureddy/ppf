// Post-build: copy the SPA shell into Frappe's www and the service worker to
// the site root so it can claim the /admin scope.
import { copyFileSync, existsSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = join(__dirname, "../../ppf/public/admin");
const wwwDir = join(__dirname, "../../ppf/www");

if (!existsSync(buildDir)) {
	console.error(`[postbuild] build dir not found: ${buildDir}`);
	process.exit(1);
}

copyFileSync(join(buildDir, "index.html"), join(wwwDir, "admin.html"));
console.log("[postbuild] index.html -> www/admin.html");

for (const f of readdirSync(buildDir)) {
	if (f === "sw.js") {
		copyFileSync(join(buildDir, f), join(wwwDir, "admin-sw.js"));
		console.log(`[postbuild] ${f} -> www/admin-sw.js`);
	}
}
