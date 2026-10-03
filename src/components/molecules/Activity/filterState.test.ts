import { describe, expect, it } from 'vitest';
import { actionsFor, defaultFilters, filtersToQuery, withEntityType, withRange } from './filterState';

const now = new Date(2026, 9, 3, 12, 0);

describe('filterState', () => {
	it('defaults to the last 30 days and seeds customer/request from the URL', () => {
		const f = defaultFilters({ customerId: 'cust_9', requestId: null }, now);
		const q = filtersToQuery(f);
		expect(q.customer_id).toBe('cust_9');
		expect(q.request_id).toBeUndefined();
		expect(new Date(q.start_time!).getTime()).toBe(now.getTime() - 30 * 86_400_000);
		expect(q.end_time).toBeUndefined();
	});
	it('clears the entity and a foreign action when the entity type changes', () => {
		const f = { ...defaultFilters({}, now), entityType: 'customer', entityId: 'cust_1', action: 'customer.updated' };
		const g = withEntityType(f, 'invoice');
		expect(g.entityId).toBe('');
		expect(g.action).toBe('');
		expect(withEntityType({ ...f, action: 'invoice.paid' }, 'invoice').action).toBe('invoice.paid');
	});
	it('never sends entity_id without entity_type', () => {
		expect(filtersToQuery({ ...defaultFilters({}, now), entityId: 'cust_1' }).entity_id).toBeUndefined();
	});
	it('makes the end date inclusive of the whole day', () => {
		const g = withRange(defaultFilters({}, now), new Date(2026, 9, 1), new Date(2026, 9, 3));
		expect(g.end!.getHours()).toBe(23);
		expect(g.end!.getMinutes()).toBe(59);
	});
	it('sends a single action as a one-item list', () => {
		expect(filtersToQuery({ ...defaultFilters({}, now), action: 'invoice.paid' }).actions).toEqual(['invoice.paid']);
	});
	it('limits actions to the chosen entity type', () => {
		expect(actionsFor('wallet', ['wallet.created', 'invoice.paid'])).toEqual(['wallet.created']);
		expect(actionsFor('', ['wallet.created', 'invoice.paid'])).toHaveLength(2);
	});
});
