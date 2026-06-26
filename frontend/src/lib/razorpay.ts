import { call, frappeError } from "./api";

export interface PayCallbacks {
	onError: (message: string) => void;
}

/**
 * Start payment via a Razorpay Payment Link (hosted on Razorpay's domain).
 * We redirect the browser to the hosted page, which avoids the "website not
 * registered" restriction that blocks the inline Checkout SDK on our domain.
 * After payment, Razorpay redirects back to /customer/orders?so=… and
 * handlePaymentCallback() verifies + records it.
 */
export async function payForOrder(salesOrder: string, cb: PayCallbacks): Promise<void> {
	try {
		const res = await call<{ short_url: string }>(
			"ppf.api.payments.create_payment_link",
			{ sales_order: salesOrder },
			"POST",
		);
		window.location.href = res.short_url;
	} catch (e) {
		cb.onError(frappeError(e, "Could not start payment."));
	}
}

/**
 * On returning from the Razorpay hosted page, verify the redirect params and
 * record the payment. Returns the resulting status, or null if there was no
 * payment callback in the URL.
 */
export async function handlePaymentCallback(): Promise<
	{ payment_status: string; paid: number; pending: number } | null
> {
	const p = new URLSearchParams(window.location.search);
	const paymentId = p.get("razorpay_payment_id");
	const linkId = p.get("razorpay_payment_link_id");
	const so = p.get("so");
	if (!paymentId || !linkId || !so) return null;

	// Remove the query params so a refresh doesn't re-trigger.
	window.history.replaceState({}, "", `${window.location.pathname}`);

	try {
		return await call<{ payment_status: string; paid: number; pending: number }>(
			"ppf.api.payments.verify_payment_link",
			{
				sales_order: so,
				razorpay_payment_id: paymentId,
				razorpay_payment_link_id: linkId,
				razorpay_payment_link_reference_id: p.get("razorpay_payment_link_reference_id") || "",
				razorpay_payment_link_status: p.get("razorpay_payment_link_status") || "",
				razorpay_signature: p.get("razorpay_signature") || "",
			},
			"POST",
		);
	} catch {
		return null;
	}
}
