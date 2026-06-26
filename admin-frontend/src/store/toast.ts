import { create } from "zustand";

export interface Toast {
	id: number;
	message: string;
	type: "success" | "error";
}

interface ToastState {
	toasts: Toast[];
	push: (message: string, type?: Toast["type"]) => void;
	remove: (id: number) => void;
}

export const useToast = create<ToastState>((set) => ({
	toasts: [],
	push: (message, type = "success") => {
		const id = Date.now() + Math.random();
		set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
		setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
	},
	remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
