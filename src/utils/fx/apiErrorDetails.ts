import type { FlatApiError } from '@/core/axios/types';

/** `details` from the flat API error body the axios client keeps on `error.cause`. */
export const getApiErrorDetails = (error: unknown): Record<string, unknown> => {
	if (!(error instanceof Error)) return {};
	const cause = (error as Error & { cause?: unknown }).cause;
	if (!cause || typeof cause !== 'object') return {};
	const details = (cause as FlatApiError).details;
	return details && typeof details === 'object' ? details : {};
};

/** Whether the backend attached this detail; details, not message text, decide where an error is shown. */
export const hasErrorDetail = (error: unknown, key: string): boolean => getApiErrorDetails(error)[key] !== undefined;

export const getOverlapIndexes = (error: unknown): number[] => {
	const details = getApiErrorDetails(error);
	return [details.first_index, details.second_index].filter((index): index is number => typeof index === 'number');
};
