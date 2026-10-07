import { describe, expect, it } from 'vitest';
import { BILLING_CURRENCY_NONE, billingCurrencyPayload, classifyBillingCurrencyError } from './customerBillingCurrency';

const withDetails = (message: string, details: unknown) => Object.assign(new Error(message), { cause: { message, details } });

describe('billingCurrencyPayload', () => {
	it('create with a currency sends it lowercase', () => {
		expect(billingCurrencyPayload(undefined, 'INR', false)).toEqual({ billing_currency: 'inr' });
	});
	it('create with None omits the key', () => {
		expect(billingCurrencyPayload(undefined, BILLING_CURRENCY_NONE, false)).toEqual({});
		expect(billingCurrencyPayload(undefined, undefined, false)).toEqual({});
	});
	it('edit clearing a set currency sends an empty string', () => {
		expect(billingCurrencyPayload('inr', BILLING_CURRENCY_NONE, true)).toEqual({ billing_currency: '' });
	});
	it('edit that had none and still has none omits the key', () => {
		expect(billingCurrencyPayload(undefined, undefined, true)).toEqual({});
	});
	it('edit keeping a currency resends it', () => {
		expect(billingCurrencyPayload('inr', 'inr', true)).toEqual({ billing_currency: 'inr' });
	});
});

describe('classifyBillingCurrencyError', () => {
	it('missing pairs', () => {
		const error = withDetails('Configure a rate or custom factor for each pair before setting this billing currency.', {
			missing_pairs: ['usd->eur'],
		});
		expect(classifyBillingCurrencyError(error)).toEqual({ kind: 'missingPairs', pairs: ['usd->eur'] });
	});
	it('open checkout', () => {
		const error = withDetails('Complete or cancel the open checkout first.', { checkout_session_ids: ['cs_1'] });
		expect(classifyBillingCurrencyError(error)).toEqual({ kind: 'openCheckout' });
	});
	it('invalid currency', () => {
		const error = withDetails('Billing currency must be a supported fiat ISO currency.', { billing_currency: 'xyz' });
		expect(classifyBillingCurrencyError(error)).toEqual({
			kind: 'invalid',
			message: 'Billing currency must be a supported fiat ISO currency.',
		});
	});
	it('anything else is not a billing-currency error', () => {
		expect(classifyBillingCurrencyError(new Error('Name is required'))).toBeUndefined();
	});
});
