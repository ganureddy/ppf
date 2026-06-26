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

api.interceptors.request.use((config) => {
	const token = window.csrf_token;
	if (token && token !== "{{ csrf_token }}") {
		config.headers["X-Frappe-CSRF-Token"] = token;
	}
	return config;
});

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

export async function uploadFile(file: File): Promise<string> {
	const fd = new FormData();
	fd.append("file", file, file.name);
	fd.append("is_private", "0");
	fd.append("folder", "Home");
	const res = await api.post("/api/method/upload_file", fd, {
		headers: { "Content-Type": "multipart/form-data" },
	});
	return res.data.message.file_url as string;
}

export async function login(usr: string, pwd: string): Promise<void> {
	await api.post("/api/method/login", { usr, pwd });
}

export async function logout(): Promise<void> {
	await api.get("/api/method/logout");
}
