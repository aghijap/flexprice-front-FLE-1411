import type { FlatApiError } from '@/core/axios/types';

/** `details` from the flat API error body the axios client keeps on `error.cause`. */
export const getApiErrorDetails = (error: unknown): Record<string, unknown> => {
	if (!(error instanceof Error)) return {};
	const cause = (error as Error & { cause?: unknown }).cause;
	if (!cause || typeof cause !== 'object') return {};
	const details = (cause as FlatApiError).details;
	return details && typeof details === 'object' ? details : {};
};

export const getMissingPairs = (error: unknown): string[] => {
	const pairs = getApiErrorDetails(error).missing_pairs;
	return Array.isArray(pairs) ? pairs.filter((pair): pair is string => typeof pair === 'string') : [];
};

export const hasOpenCheckoutSessions = (error: unknown): boolean => {
	const ids = getApiErrorDetails(error).checkout_session_ids;
	return Array.isArray(ids) && ids.length > 0;
};

/** "usd->inr" → "USD → INR". */
export const formatMissingPair = (pair: string): string =>
	pair
		.split('->')
		.map((code) => code.toUpperCase())
		.join(' → ');

export const getOverlapIndexes = (error: unknown): number[] => {
	const details = getApiErrorDetails(error);
	return [details.first_index, details.second_index].filter((index): index is number => typeof index === 'number');
};
