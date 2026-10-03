import { describe, expect, it } from 'vitest';
import { initialConditions } from './ActivityLogPage';
import { conditionsToQuery } from '@/components/molecules/Activity/ActivityFilters';

describe('ActivityLogPage URL seeding', () => {
	it('seeds a customer_id filter from the URL param so the query carries it', () => {
		const q = conditionsToQuery(initialConditions('cust_9'));
		expect(q.customer_id).toBe('cust_9');
	});
	it('has no customer filter when the param is absent', () => {
		const q = conditionsToQuery(initialConditions(null));
		expect(q.customer_id).toBeUndefined();
	});
});
