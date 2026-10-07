import { describe, expect, it } from 'vitest';
import { getApiErrorDetails, getOverlapIndexes, hasErrorDetail } from './apiErrorDetails';

const withDetails = (details: unknown) => Object.assign(new Error('x'), { cause: { code: 'validation_error', message: 'x', details } });

describe('apiErrorDetails', () => {
	it('tolerates a missing cause, missing details or a non-error', () => {
		expect(getApiErrorDetails(new Error('x'))).toEqual({});
		expect(getApiErrorDetails(withDetails(undefined))).toEqual({});
		expect(getApiErrorDetails('boom')).toEqual({});
	});
	it('tells whether a detail is present', () => {
		expect(hasErrorDetail(withDetails({ missing_pairs: ['usd->inr'] }), 'missing_pairs')).toBe(true);
		expect(hasErrorDetail(withDetails({}), 'missing_pairs')).toBe(false);
		expect(hasErrorDetail(new Error('x'), 'missing_pairs')).toBe(false);
	});
	it('reads overlap indexes', () => {
		expect(getOverlapIndexes(withDetails({ first_index: 0, second_index: 1 }))).toEqual([0, 1]);
		expect(getOverlapIndexes(withDetails({}))).toEqual([]);
	});
});
