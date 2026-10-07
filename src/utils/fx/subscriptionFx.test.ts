import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/common/custom_currency', () => ({ isCustomCurrency: (code?: string | null) => code === 'crd' }));

import {
	canSetSubscriptionFxRates,
	isSubscriptionFxError,
	resolveBillingCurrency,
	showSubscriptionFxErrorInline,
	toInlineFxRates,
} from './subscriptionFx';

describe('resolveBillingCurrency', () => {
	it('uses the first present customer, like the backend uses the invoicing customer', () => {
		expect(resolveBillingCurrency('usd', [{ billing_currency: 'inr' }, { billing_currency: 'eur' }])).toBe('inr');
	});
	it('does not fall through to a later customer when the first has none', () => {
		expect(resolveBillingCurrency('usd', [{}, { billing_currency: 'eur' }])).toBeUndefined();
	});
	it('skips missing candidates', () => {
		expect(resolveBillingCurrency('usd', [undefined, null, { billing_currency: 'INR' }])).toBe('inr');
	});
	it('is undefined when the billing currency equals the charge currency', () => {
		expect(resolveBillingCurrency('USD', [{ billing_currency: 'usd' }])).toBeUndefined();
	});
});

describe('canSetSubscriptionFxRates', () => {
	it('is false for a custom charge currency', () => {
		expect(canSetSubscriptionFxRates('crd', 'inr')).toBe(false);
	});
	it('is true for a fiat charge currency billed elsewhere', () => {
		expect(canSetSubscriptionFxRates('usd', 'inr')).toBe(true);
	});
});

describe('toInlineFxRates', () => {
	const rows = [
		{ id: 'r1', rate: '90', end_date: '2026-04-01T00:00:00.000Z' },
		{ id: 'r2', rate: '95', start_date: '2026-04-01T00:00:00.000Z' },
	];
	it('drops the local id and empty bounds', () => {
		expect(toInlineFxRates(rows, true)).toEqual([
			{ rate: '90', end_date: '2026-04-01T00:00:00.000Z' },
			{ rate: '95', start_date: '2026-04-01T00:00:00.000Z' },
		]);
	});
	it('sends nothing when the table is hidden', () => {
		expect(toInlineFxRates(rows, false)).toBeUndefined();
	});
});

describe('isSubscriptionFxError', () => {
	it.each([
		'Each fx_rates entry must cover a separate period.',
		'fx_rates can only be set on a fiat subscription billed in another currency.',
		'Configure a rate or custom factor for usd to inr before creating this subscription.',
		'Provide a positive exchange rate for every fx_rates entry.',
		'The start of a validity window must be before its end.',
	])('recognises "%s"', (message) => {
		expect(isSubscriptionFxError(message)).toBe(true);
	});
	it('ignores unrelated errors', () => {
		expect(isSubscriptionFxError('plan not found')).toBe(false);
	});
});

describe('showSubscriptionFxErrorInline', () => {
	const message = 'Configure a rate or custom factor for crd to inr before creating this subscription.';
	it('is inline only when the FX Overrides table is visible', () => {
		expect(showSubscriptionFxErrorInline(message, true)).toBe(true);
	});
	it('is not inline when the table is hidden (custom charge currency, stale data)', () => {
		expect(showSubscriptionFxErrorInline(message, false)).toBe(false);
	});
});
