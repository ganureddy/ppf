import { useEffect, useState } from "react";
import { useTallySettings, useUpdateTallySettings } from "@/api/hooks";
import { Loading, Spinner } from "@/components/EmptyState";
import { frappeError } from "@/lib/api";
import { useToast } from "@/store/toast";
import type { TallySettings } from "@/lib/types";

const field =
	"w-full rounded-lg border border-ppf-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ppf-purple";
const label = "mb-1 block text-sm font-medium text-ppf-text";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="mt-3 rounded-card bg-white p-4 shadow-card">
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ppf-purple">{title}</h3>
			<div className="space-y-3">{children}</div>
		</div>
	);
}

const empty: TallySettings = { tally_enabled: false };

export default function TallyIntegration() {
	const { data, isLoading } = useTallySettings();
	const update = useUpdateTallySettings();
	const { push } = useToast();
	const [f, setF] = useState<TallySettings>(empty);

	useEffect(() => {
		if (data) setF(data);
	}, [data]);

	if (isLoading) return <Loading />;
	const set = (k: keyof TallySettings, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

	async function save() {
		try {
			await update.mutateAsync({
				tally_enabled: f.tally_enabled ? 1 : 0,
				base_url: f.base_url || "",
				tally_company: f.tally_company || "",
				port: f.port || "",
				api_key: f.api_key || "",
				api_secret: f.api_secret || "",
				webhook_url: f.webhook_url || "",
				sync_mode: f.sync_mode || "",
				sync_frequency: f.sync_frequency || "",
				default_sales_ledger: f.default_sales_ledger || "",
				default_purchase_ledger: f.default_purchase_ledger || "",
				default_party_ledger: f.default_party_ledger || "",
			});
			push("Tally settings saved");
		} catch (e) {
			push(frappeError(e, "Could not save"), "error");
		}
	}

	return (
		<div className="p-4 pb-8">
			<div className="rounded-card bg-gradient-to-br from-ppf-purple-deep to-ppf-purple p-4 text-white shadow-card">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-lg font-bold">Tally Integration</p>
						<p className="text-sm text-white/80">Sync orders, invoices & payments to Tally</p>
					</div>
					<span className={`rounded-full px-3 py-1 text-xs font-semibold ${f.tally_enabled ? "bg-white text-ppf-purple" : "bg-white/20"}`}>
						{f.connection_status || "Not Connected"}
					</span>
				</div>
			</div>

			<div className="mt-3 flex items-center justify-between rounded-card bg-white p-4 shadow-card">
				<span className="font-medium text-ppf-text">Enable Tally Integration</span>
				<input type="checkbox" className="h-5 w-5 accent-[#7C3AED]" checked={!!f.tally_enabled} onChange={(e) => set("tally_enabled", e.target.checked)} />
			</div>

			<Section title="Connection">
				<div><label className={label}>Tally Server / Base URL</label><input className={field} value={f.base_url || ""} onChange={(e) => set("base_url", e.target.value)} placeholder="http://localhost" /></div>
				<div className="grid grid-cols-2 gap-3">
					<div><label className={label}>Tally Company</label><input className={field} value={f.tally_company || ""} onChange={(e) => set("tally_company", e.target.value)} placeholder="Purple Patch Farms" /></div>
					<div><label className={label}>Port</label><input className={field} value={f.port || ""} onChange={(e) => set("port", e.target.value)} placeholder="9000" /></div>
				</div>
			</Section>

			<Section title="Authentication">
				<div><label className={label}>API Key</label><input className={field} value={f.api_key || ""} onChange={(e) => set("api_key", e.target.value)} placeholder="••••••••" /></div>
				<div><label className={label}>API Secret</label><input className={field} type="password" value={f.api_secret || ""} onChange={(e) => set("api_secret", e.target.value)} placeholder="••••••••" /></div>
				<div><label className={label}>Webhook URL</label><input className={field} value={f.webhook_url || ""} onChange={(e) => set("webhook_url", e.target.value)} placeholder="https://ppf.emrid.store/api/method/..." /></div>
			</Section>

			<Section title="Sync">
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className={label}>Sync Mode</label>
						<select className={field} value={f.sync_mode || ""} onChange={(e) => set("sync_mode", e.target.value)}>
							<option value="">Select…</option>
							<option>Real-time</option><option>Scheduled</option><option>Manual</option>
						</select>
					</div>
					<div>
						<label className={label}>Frequency</label>
						<select className={field} value={f.sync_frequency || ""} onChange={(e) => set("sync_frequency", e.target.value)}>
							<option value="">Select…</option>
							<option>Every 15 Minutes</option><option>Hourly</option><option>Daily</option>
						</select>
					</div>
				</div>
			</Section>

			<Section title="Ledger Mapping">
				<div><label className={label}>Default Sales Ledger</label><input className={field} value={f.default_sales_ledger || ""} onChange={(e) => set("default_sales_ledger", e.target.value)} placeholder="Sales Account" /></div>
				<div><label className={label}>Default Purchase Ledger</label><input className={field} value={f.default_purchase_ledger || ""} onChange={(e) => set("default_purchase_ledger", e.target.value)} placeholder="Purchase Account" /></div>
				<div><label className={label}>Default Party Ledger</label><input className={field} value={f.default_party_ledger || ""} onChange={(e) => set("default_party_ledger", e.target.value)} placeholder="Sundry Debtors" /></div>
			</Section>

			<div className="mt-4 flex gap-2">
				<button onClick={() => push("Connection test queued (integration coming soon)")} className="flex-1 rounded-xl border border-ppf-purple py-3 font-semibold text-ppf-purple">
					Test Connection
				</button>
				<button onClick={save} disabled={update.isPending} className="flex flex-1 items-center justify-center rounded-xl bg-ppf-purple py-3 font-semibold text-white disabled:opacity-60">
					{update.isPending ? <Spinner className="border-white/30 border-t-white" /> : "Save Settings"}
				</button>
			</div>
		</div>
	);
}
