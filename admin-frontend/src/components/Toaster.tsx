import { useToast } from "@/store/toast";

export function Toaster() {
	const { toasts } = useToast();
	return (
		<div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={`pointer-events-auto w-full max-w-[420px] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
						t.type === "error" ? "bg-ppf-danger" : "bg-ppf-green"
					}`}
				>
					{t.message}
				</div>
			))}
		</div>
	);
}
