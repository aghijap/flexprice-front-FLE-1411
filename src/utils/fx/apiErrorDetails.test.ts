import { describe, expect, it } from 'vitest';
import { getApiErrorDetails, getMissingPairs, getOverlapIndexes, hasOpenCheckoutSessions } from './apiErrorDetails';

const withDetails = (details: unknown) => Object.assign(new Error('x'), { cause: { code: 'validation_error', message: 'x', details } });

describe('apiErrorDetails', () => {
	it('tolerates a missing cause, missing details or a non-error', () => {
		expect(getApiErrorDetails(new Error('x'))).toEqual({});
		expect(getApiErrorDetails(withDetails(undefined))).toEqual({});
		expect(getApiErrorDetails('boom')).toEqual({});
	});
	it('extracts missing pairs and ignores non-strings', () => {
		expect(getMissingPairs(withDetails({ missing_pairs: ['usd->inr', 3, 'gbp->inr'] }))).toEqual(['usd->inr', 'gbp->inr']);
		expect(getMissingPairs(withDetails({ missing_pairs: 'usd->inr' }))).toEqual([]);
	});
	it('detects open checkout sessions', () => {
		expect(hasOpenCheckoutSessions(withDetails({ checkout_session_ids: ['cs_1'], customer_id: 'c' }))).toBe(true);
		expect(hasOpenCheckoutSessions(withDetails({ checkout_session_ids: [] }))).toBe(false);
	});
	it('reads overlap indexes', () => {
		expect(getOverlapIndexes(withDetails({ first_index: 0, second_index: 1 }))).toEqual([0, 1]);
		expect(getOverlapIndexes(withDetails({}))).toEqual([]);
	});
});
