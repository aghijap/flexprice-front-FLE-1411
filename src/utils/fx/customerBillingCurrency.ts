import { hasErrorDetail } from './apiErrorDetails';

/** Select value for "no billing currency"; Radix Select cannot hold ''. */
export const BILLING_CURRENCY_NONE = '__none__';

/** The billing_currency part of a create/update payload. '' clears it on update. */
export const billingCurrencyPayload = (
	original: string | undefined,
	selected: string | undefined,
	isEdit: boolean,
): { billing_currency?: string } => {
	const next = selected && selected !== BILLING_CURRENCY_NONE ? selected.toLowerCase() : undefined;
	if (next) return { billing_currency: next };
	if (isEdit && original) return { billing_currency: '' };
	return {};
};

const BILLING_CURRENCY_DETAILS = ['missing_pairs', 'checkout_session_ids', 'billing_currency'];

/** A billing-currency rejection, shown as sent under the Billing Currency field. */
export const isBillingCurrencyError = (error: unknown): boolean => BILLING_CURRENCY_DETAILS.some((key) => hasErrorDetail(error, key));
