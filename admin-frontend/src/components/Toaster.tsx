import { useToast } from "@/store/toast";

export function Toaster() {
	const { toasts, remove } = useToast();
	return (
		<div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={`pointer-events-auto flex w-full max-w-[420px] items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
						t.type === "error" ? "bg-ppf-danger" : "bg-ppf-green"
					}`}
				>
					<span>{t.message}</span>
					{t.action && (
						<button
							onClick={() => {
								t.action?.onClick();
								remove(t.id);
							}}
							className="shrink-0 rounded-lg bg-white/25 px-3 py-1 text-xs font-bold uppercase tracking-wide"
						>
							{t.action.label}
						</button>
					)}
				</div>
			))}
		</div>
	);
}
