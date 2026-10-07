import { getMissingPairs, hasOpenCheckoutSessions } from './apiErrorDetails';

/** Select value for "no billing currency"; Radix Select cannot hold ''. */
export const BILLING_CURRENCY_NONE = '__none__';

const INVALID_CURRENCY_HINT = 'Billing currency must be a supported fiat ISO currency.';

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

export type BillingCurrencyError =
	| { kind: 'missingPairs'; pairs: string[] }
	| { kind: 'openCheckout' }
	| { kind: 'invalid'; message: string };

export const classifyBillingCurrencyError = (error: unknown): BillingCurrencyError | undefined => {
	const pairs = getMissingPairs(error);
	if (pairs.length > 0) return { kind: 'missingPairs', pairs };
	if (hasOpenCheckoutSessions(error)) return { kind: 'openCheckout' };
	if (error instanceof Error && error.message === INVALID_CURRENCY_HINT) return { kind: 'invalid', message: error.message };
	return undefined;
};
