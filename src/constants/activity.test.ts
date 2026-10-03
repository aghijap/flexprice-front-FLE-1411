import { describe, expect, it } from 'vitest';
import { ACTIVITY_ACTIONS, ACTIVITY_ENTITY_TYPES } from './activity';

describe('activity constants', () => {
	it('only offers entity types the v1 filter can narrow by their actions', () => {
		for (const type of ACTIVITY_ENTITY_TYPES) {
			expect(
				ACTIVITY_ACTIONS.some((a) => a.startsWith(`${type}.`)),
				type,
			).toBe(true);
		}
	});
	it('does not offer the child and association types', () => {
		expect(ACTIVITY_ENTITY_TYPES).not.toContain('addon_association');
		expect(ACTIVITY_ENTITY_TYPES).not.toContain('invoice_line_item');
	});
});
