import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { ActivityItem } from '@/types/dto/ActivityLog';
import { actorName, entityTitle, rowDetail, summaryOf } from './summary';

const t = ((key: string, o?: Record<string, unknown>) => {
	if (key === 'verb.created') return `${o?.actor} created ${o?.entityType} ${o?.entity}`;
	if (key === 'entity.invoice') return 'Invoice';
	if (key === 'actor.system') return 'System';
	return typeof o?.defaultValue === 'string' ? o.defaultValue : key;
}) as unknown as TFunction;

const mk = (over: Partial<ActivityItem['display']['parts']> = {}, item: Partial<ActivityItem> = {}): ActivityItem => ({
	id: 'act_1',
	entity_type: 'invoice',
	entity_id: 'inv_01HX7KQ2M9RQ',
	entity_label: 'inv_01HX7KQ2M9RQ',
	action: 'invoice.created',
	actor: { type: 'user', id: 'u1', label: 'Alice' },
	source: 'dashboard',
	occurred_at: '2026-10-03T10:00:00Z',
	display: {
		summary: 'Alice created invoice inv_01HX7KQ2M9RQ',
		entity_label: 'inv_01HX7KQ2M9RQ',
		parts: { actor: 'Alice', verb: 'created', entity_type: 'invoice', entity: 'inv_01HX7KQ2M9RQ', field: null, count: 0, ...over },
	},
	...item,
});

describe('summary', () => {
	it('shortens a label that is just the raw id', () => {
		expect(entityTitle(mk())).toBe('inv_…Q2M9RQ');
		expect(summaryOf(mk(), t)).toBe('Alice created Invoice inv_…Q2M9RQ');
	});
	it('keeps a real label', () => {
		expect(entityTitle(mk({ entity: 'INV-00417' }))).toBe('INV-00417');
	});
	it('falls back to the short id when the label is empty', () => {
		expect(entityTitle(mk({ entity: '' }, { entity_label: '' }))).toBe('inv_…Q2M9RQ');
	});
	it('uses a readable actor name when the backend sent only the actor type', () => {
		expect(actorName(mk({ actor: 'system' }, { actor: { type: 'system', id: 'sys', label: '' } }), t)).toBe('System');
	});
	it('builds a sentence without a template and without the raw id', () => {
		const s = summaryOf(mk({ verb: 'voided' }), t);
		expect(s).toBe('Alice voided Invoice inv_…Q2M9RQ');
		expect(s).not.toContain('inv_01HX7KQ2M9RQ');
	});
});

describe('rowDetail', () => {
	const ch = (label: string, from: unknown, to: unknown, extra: object = {}) => ({ label, from, to, format: 'text', ...extra });
	const withChanges = (changes: ActivityItem['changes'], action = 'invoice.updated') => mk({}, { changes, action });

	it('shows a diff for one short scalar change', () => {
		const d = rowDetail(withChanges({ status: ch('Status', 'active', 'paused') }));
		expect(d).toMatchObject({ kind: 'diff', label: 'Status' });
	});
	it('says the field changed when the value is a JSON blob or long text', () => {
		expect(rowDetail(withChanges({ metadata: ch('Metadata', null, '{"razorpay_customer_id":"cust_Tj"}') }))).toEqual({
			kind: 'changed',
			label: 'Metadata',
		});
		expect(rowDetail(withChanges({ note: ch('Note', 'a', 'x'.repeat(60)) }))).toEqual({ kind: 'changed', label: 'Note' });
	});
	it('names the fields when several changed, capped at three', () => {
		const d = rowDetail(withChanges({ a: ch('A', 1, 2), b: ch('B', 1, 2), c: ch('C', 1, 2), d: ch('D', 1, 2) }));
		expect(d).toEqual({ kind: 'fields', labels: ['A', 'B', 'C'], more: 1 });
	});
	it('describes created, deleted and uncaptured rows', () => {
		expect(rowDetail(mk({}, { action: 'invoice.created', snapshot: { name: 'x', amount: '5', id: 'i', tenant_id: 't' } }))).toEqual({
			kind: 'created',
			count: 2,
		});
		expect(rowDetail(mk({}, { action: 'invoice.deleted' }))).toEqual({ kind: 'deleted' });
		expect(rowDetail(mk({}, { action: 'invoice.updated' }))).toEqual({ kind: 'notCaptured' });
		expect(rowDetail(mk({}, { action: 'invoice.finalized' }))).toBeNull();
	});
	it('keeps a redacted single change as a diff-less marker', () => {
		expect(rowDetail(withChanges({ tax_id: ch('Tax id', null, null, { redacted: true }) }))).toEqual({ kind: 'redacted', label: 'Tax id' });
	});
});
