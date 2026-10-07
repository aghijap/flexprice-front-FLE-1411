import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockCreate, mockUpdate } = vi.hoisted(() => ({ mockQuery: vi.fn(), mockCreate: vi.fn(), mockUpdate: vi.fn() }));
vi.mock('@/api/FxRateApi', () => ({ default: { queryFxRates: mockQuery, createFxRate: mockCreate, updateFxRate: mockUpdate } }));
vi.mock('@/hooks/useEnvironment', () => ({ default: () => ({ activeEnvironment: { id: 'env_1' } }) }));

import { duplicatePairError, useGlobalForexRates } from './useGlobalForexRates';

const wrapper = ({ children }: { children: ReactNode }) => (
	<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
		{children}
	</QueryClientProvider>
);

beforeEach(() => {
	mockQuery.mockReset().mockResolvedValue({ items: [], pagination: { total: 0, limit: 10, offset: 0 } });
	mockCreate.mockReset().mockResolvedValue({});
	mockUpdate.mockReset().mockResolvedValue({});
});

describe('useGlobalForexRates', () => {
	it('queries tenant rates for the page', async () => {
		renderHook(() => useGlobalForexRates({ page: 2, limit: 10, offset: 10 }), { wrapper });
		await waitFor(() => expect(mockQuery).toHaveBeenCalledWith({ scope: 'tenant', limit: 10, offset: 10 }));
	});

	it('creates a tenant rate with only the pair and the rate', async () => {
		const { result } = renderHook(() => useGlobalForexRates({ page: 1, limit: 10, offset: 0 }), { wrapper });
		result.current.createRate.mutate({ from_currency: 'usd', to_currency: 'inr', rate: '83' });
		await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ scope: 'tenant', from_currency: 'usd', to_currency: 'inr', rate: '83' }));
	});

	it('updates only the rate', async () => {
		const { result } = renderHook(() => useGlobalForexRates({ page: 1, limit: 10, offset: 0 }), { wrapper });
		result.current.updateRate.mutate({ id: 'fxr_1', rate: '84' });
		await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('fxr_1', { rate: '84' }));
	});
});

describe('duplicatePairError', () => {
	it('is true for a 409', () => {
		expect(duplicatePairError(Object.assign(new Error('a tenant FX rate already exists'), { status: 409 }))).toBe(true);
	});
	it('is false for other statuses', () => {
		expect(duplicatePairError(Object.assign(new Error('bad'), { status: 400 }))).toBe(false);
	});
});
