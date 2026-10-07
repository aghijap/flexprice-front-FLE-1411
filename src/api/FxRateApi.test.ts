import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock('@/core/axios/verbs', () => ({ AxiosClient: { post: mockPost, get: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/core/services/supbase/config', () => ({ default: {} }));
vi.mock('@/core/auth/AuthService', () => ({ default: {} }));

import FxRateApi from './FxRateApi';

beforeEach(() => mockPost.mockReset().mockResolvedValue({ items: [], pagination: { total: 0, limit: 10, offset: 0 } }));

describe('FxRateApi.queryFxRates', () => {
	it('lists fixed rates only (market rates are not supported yet)', async () => {
		await FxRateApi.queryFxRates({ scope: 'tenant', limit: 10, offset: 0 });
		expect(mockPost).toHaveBeenCalledWith('/forex/query', {
			scope: 'tenant',
			limit: 10,
			offset: 0,
			filters: [{ field: 'source', operator: 'eq', data_type: 'string', value: { string: 'fixed' } }],
		});
	});
});
