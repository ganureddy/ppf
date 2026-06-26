import { ProfileForm } from "@/components/ProfileForm";

const LOGO = "https://ppf.emrid.store/files/172355246554z5jjLtKL.png";

export default function Onboarding() {
	return (
		<div className="mx-auto min-h-full max-w-[480px] bg-white">
			<div className="bg-gradient-to-br from-ppf-green-deep to-ppf-green px-6 pb-8 pt-12 text-center text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 2.5rem)" }}>
				<img src={LOGO} alt="" className="mx-auto h-16 w-16 rounded-full bg-white object-contain p-1" />
				<h1 className="mt-3 text-2xl font-bold">Complete your profile</h1>
				<p className="mt-1 text-sm text-white/85">We need your phone & delivery address to start delivering fresh produce.</p>
			</div>
			<div className="p-6">
				<ProfileForm ctaLabel="Save & Continue" />
			</div>
		</div>
	);
}
