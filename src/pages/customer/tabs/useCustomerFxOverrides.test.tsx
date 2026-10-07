import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockCreate, mockUpdate, mockDelete } = vi.hoisted(() => ({
	mockQuery: vi.fn(),
	mockCreate: vi.fn(),
	mockUpdate: vi.fn(),
	mockDelete: vi.fn(),
}));
vi.mock('@/api/FxRateApi', () => ({
	default: { queryFxRates: mockQuery, createFxRate: mockCreate, updateFxRate: mockUpdate, deleteFxRate: mockDelete },
}));

import { classifyOverrideError, diffOverride, useCustomerFxOverrides } from './useCustomerFxOverrides';

const wrapper = ({ children }: { children: ReactNode }) => (
	<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
		{children}
	</QueryClientProvider>
);
const pageArgs = { page: 1, limit: 10, offset: 0 };

beforeEach(() => {
	mockQuery.mockReset().mockResolvedValue({ items: [], pagination: { total: 0, limit: 10, offset: 0 } });
	mockCreate.mockReset().mockResolvedValue({});
	mockUpdate.mockReset().mockResolvedValue({});
	mockDelete.mockReset().mockResolvedValue(undefined);
});

describe('useCustomerFxOverrides', () => {
	it('queries the customer scope', async () => {
		renderHook(() => useCustomerFxOverrides('cust_1', pageArgs), { wrapper });
		await waitFor(() => expect(mockQuery).toHaveBeenCalledWith({ scope: 'customer', scope_id: 'cust_1', limit: 10, offset: 0 }));
	});

	it('creates with scope_id and the window', async () => {
		const { result } = renderHook(() => useCustomerFxOverrides('cust_1', pageArgs), { wrapper });
		result.current.createOverride.mutate({
			from_currency: 'usd',
			to_currency: 'inr',
			rate: '84.5',
			start_date: '2026-01-01T00:00:00.000Z',
		});
		await waitFor(() =>
			expect(mockCreate).toHaveBeenCalledWith({
				scope: 'customer',
				scope_id: 'cust_1',
				from_currency: 'usd',
				to_currency: 'inr',
				rate: '84.5',
				start_date: '2026-01-01T00:00:00.000Z',
			}),
		);
	});

	it('deletes by id', async () => {
		const { result } = renderHook(() => useCustomerFxOverrides('cust_1', pageArgs), { wrapper });
		await result.current.deleteOverride('fxr_9');
		expect(mockDelete).toHaveBeenCalledWith('fxr_9');
	});
});

describe('diffOverride', () => {
	const original = { from_currency: 'usd', to_currency: 'inr', rate: '84', start_date: '2026-01-01T00:00:00.000Z' };
	it('sends only changed fields', () => {
		expect(diffOverride(original, { ...original, rate: '85' })).toEqual({ rate: '85' });
	});
	it('sends a changed or newly set date', () => {
		expect(diffOverride(original, { ...original, end_date: '2026-02-01T00:00:00.000Z' })).toEqual({ end_date: '2026-02-01T00:00:00.000Z' });
	});
	it('ignores the same instant written differently', () => {
		expect(diffOverride(original, { ...original, start_date: '2026-01-01T00:00:00Z' })).toEqual({});
	});
});

describe('classifyOverrideError', () => {
	it('recognises the backend overlap hint', () => {
		expect(classifyOverrideError(new Error('Another override for this scope and currency pair covers an overlapping period.'))).toBe(
			'overlap',
		);
	});
	it('recognises the backend missing-tenant-rate hint', () => {
		expect(classifyOverrideError(new Error('Configure a tenant rate for this pair before adding an override.'))).toBe('noTenantRate');
	});
	it('returns undefined otherwise', () => {
		expect(classifyOverrideError(new Error('rate must be greater than zero'))).toBeUndefined();
	});
});
