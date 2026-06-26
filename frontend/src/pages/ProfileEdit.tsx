import { useNavigate } from "react-router-dom";
import { ProfileForm } from "@/components/ProfileForm";
import { BackIcon } from "@/components/icons";

export default function ProfileEdit() {
	const navigate = useNavigate();
	return (
		<div className="min-h-full bg-white">
			<header className="sticky top-0 z-20 flex items-center gap-3 bg-white px-4 py-3 shadow-sm" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
				<button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ppf-bg"><BackIcon width={20} height={20} /></button>
				<h1 className="text-lg font-bold text-ppf-text">Phone & Address</h1>
			</header>
			<div className="p-6">
				<p className="mb-4 text-sm text-ppf-subtext">Phone number and address are required for delivery.</p>
				<ProfileForm ctaLabel="Save Changes" onDone={() => navigate("/profile")} />
			</div>
		</div>
	);
}
