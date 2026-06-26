import { create } from "zustand";

export interface ToastAction {
	label: string;
	onClick: () => void;
}

export interface Toast {
	id: number;
	message: string;
	type: "success" | "error";
	action?: ToastAction;
}

interface PushOptions {
	action?: ToastAction;
	duration?: number;
}

interface ToastState {
	toasts: Toast[];
	push: (message: string, type?: Toast["type"], options?: PushOptions) => void;
	remove: (id: number) => void;
}

export const useToast = create<ToastState>((set) => ({
	toasts: [],
	push: (message, type = "success", options) => {
		const id = Date.now() + Math.random();
		set((s) => ({ toasts: [...s.toasts, { id, message, type, action: options?.action }] }));
		// Actionable toasts (e.g. Undo) linger a little longer so they can be tapped.
		const ttl = options?.duration ?? (options?.action ? 6000 : 3500);
		setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ttl);
	},
	remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
