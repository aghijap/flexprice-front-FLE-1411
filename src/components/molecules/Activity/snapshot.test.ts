import { describe, expect, it } from 'vitest';
import { snapshotRows } from './snapshot';

describe('snapshotRows', () => {
	it('drops empty, internal and nested values and formats the rest', () => {
		const rows = snapshotRows({
			id: 'cust_1',
			tenant_id: 't',
			environment_id: 'e',
			metadata: { a: 1 },
			address: { city: 'Pune' },
			tags: [],
			email: '',
			phone: null,
			name: 'Acme',
			auto_pay: true,
			trial_end: '2026-10-03T10:00:00Z',
			tax_id: '[redacted]',
			parent_customer_id: 'cust_01HXPARENT01',
		});
		expect(rows.map((r) => r.key)).toEqual(['auto_pay', 'name', 'parent_customer_id', 'tax_id', 'trial_end']);
		expect(rows.find((r) => r.key === 'auto_pay')?.format).toBe('boolean');
		expect(rows.find((r) => r.key === 'trial_end')?.format).toBe('date');
		expect(rows.find((r) => r.key === 'tax_id')?.format).toBe('redacted');
		expect(rows.find((r) => r.key === 'parent_customer_id')?.format).toBe('ref:customer');
		expect(rows.find((r) => r.key === 'name')?.label).toBe('Name');
	});
	it('handles a missing snapshot', () => {
		expect(snapshotRows(undefined)).toEqual([]);
	});
});
