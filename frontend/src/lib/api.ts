import axios from "axios";

declare global {
	interface Window {
		csrf_token?: string;
		frappe?: { boot?: Record<string, unknown> };
	}
}

export const api = axios.create({
	baseURL: "/",
	withCredentials: true,
	headers: { "Content-Type": "application/json" },
});

function initialToken(): string {
	const t = window.csrf_token;
	return t && t !== "{{ csrf_token }}" ? t : "";
}

let csrfToken = initialToken();
let csrfFetch: Promise<string> | null = null;

/** Fetch a valid CSRF token for the current session at runtime. */
async function fetchCsrf(): Promise<string> {
	if (!csrfFetch) {
		csrfFetch = axios
			.get("/api/method/ppf.api.auth.csrf", { withCredentials: true })
			.then((r) => {
				csrfToken = r.data.message || "";
				return csrfToken;
			})
			.finally(() => {
				csrfFetch = null;
			});
	}
	return csrfFetch;
}

api.interceptors.request.use(async (config) => {
	const method = (config.method || "get").toLowerCase();
	if (method !== "get") {
		if (!csrfToken) await fetchCsrf();
		config.headers["X-Frappe-CSRF-Token"] = csrfToken;
	}
	return config;
});

// If a write fails because the CSRF token was stale, fetch a fresh one and retry once.
api.interceptors.response.use(
	(r) => r,
	async (error) => {
		const cfg = error.config as (typeof error.config & { _csrfRetried?: boolean }) | undefined;
		const data = error?.response?.data;
		const isCsrf =
			data &&
			(data.exc_type === "CSRFTokenError" ||
				/csrf/i.test(typeof data === "string" ? data : JSON.stringify(data)));
		if (isCsrf && cfg && !cfg._csrfRetried) {
			cfg._csrfRetried = true;
			await fetchCsrf();
			cfg.headers = cfg.headers || {};
			cfg.headers["X-Frappe-CSRF-Token"] = csrfToken;
			return api(cfg);
		}
		return Promise.reject(error);
	},
);

/** Extract Frappe's human-readable error message from a failed response. */
export function frappeError(err: unknown, fallback = "Something went wrong."): string {
	const e = err as {
		response?: { data?: { message?: string; exc?: string; _server_messages?: string } };
	};
	const data = e?.response?.data;
	if (data?.message) return data.message;
	if (data?._server_messages) {
		try {
			const msgs = JSON.parse(data._server_messages) as string[];
			if (msgs.length) {
				const parsed = JSON.parse(msgs[0]) as { message?: string };
				return parsed.message || msgs[0];
			}
		} catch {
			/* ignore */
		}
	}
	return fallback;
}

/** Call a Frappe whitelisted method and unwrap the `message` payload. */
export async function call<T>(
	method: string,
	params?: Record<string, unknown>,
	httpMethod: "GET" | "POST" = "GET",
): Promise<T> {
	const url = `/api/method/${method}`;
	if (httpMethod === "GET") {
		const res = await api.get(url, { params });
		return res.data.message as T;
	}
	const res = await api.post(url, params);
	return res.data.message as T;
}

export async function login(usr: string, pwd: string): Promise<void> {
	await api.post("/api/method/login", { usr, pwd });
}

export async function logout(): Promise<void> {
	await api.get("/api/method/logout");
}
