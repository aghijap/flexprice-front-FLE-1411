import { describe, expect, it } from 'vitest';
import { labelFor, shortId } from './entityRegistry';

describe('label ladder', () => {
	it('customer prefers name then external id then short id', () => {
		expect(labelFor('customer', { id: 'cust_01HXABCDEF', name: 'Acme', external_id: 'ext' })).toBe('Acme');
		expect(labelFor('customer', { id: 'cust_01HXABCDEF', external_id: 'ext' })).toBe('ext');
		expect(labelFor('customer', { id: 'cust_01HXABCDEF' })).toBe('cust_…ABCDEF');
	});
	it('wallet falls back to currency and type, never a positional name', () => {
		expect(labelFor('wallet', { id: 'wallet_01HXABCDEF', currency: 'USD', wallet_type: 'PRE_PAID' })).toBe('USD pre paid wallet');
		expect(labelFor('wallet', { id: 'wallet_01HXABCDEF', name: 'Credits' })).toBe('Credits');
	});
	it('invoice uses invoice number', () => {
		expect(labelFor('invoice', { id: 'inv_01HXABCDEF', invoice_number: 'INV-0042' })).toBe('INV-0042');
	});
	it('shortId keeps prefix and last six', () => {
		expect(shortId('subs_01HX7KQ2M9RQ')).toBe('subs_…Q2M9RQ');
	});
});
