import { describe, expect, it } from 'vitest';
import { conditionsToQuery } from './ActivityFilters';
import { DataType, FilterOperator } from '@/types/common/QueryBuilder';

describe('conditionsToQuery', () => {
	it('maps eq, in, before, after and drops unsupported operators', () => {
		const q = conditionsToQuery([
			{ id: '1', field: 'entity_type', operator: FilterOperator.EQUAL, dataType: DataType.STRING, valueString: 'subscription' },
			{ id: '2', field: 'entity_id', operator: FilterOperator.EQUAL, dataType: DataType.STRING, valueString: 'subs_1' },
			{ id: '3', field: 'actions', operator: FilterOperator.IN, dataType: DataType.ARRAY, valueArray: ['subscription.paused'] },
			{
				id: '4',
				field: 'occurred_at',
				operator: FilterOperator.AFTER,
				dataType: DataType.DATE,
				valueDate: new Date('2026-09-03T00:00:00Z'),
			},
			{
				id: '5',
				field: 'occurred_at',
				operator: FilterOperator.BEFORE,
				dataType: DataType.DATE,
				valueDate: new Date('2026-10-03T00:00:00Z'),
			},
			{ id: '6', field: 'entity_id', operator: FilterOperator.CONTAINS, dataType: DataType.STRING, valueString: 'x' },
		]);
		expect(q).toEqual({
			entity_type: 'subscription',
			entity_id: 'subs_1',
			actions: ['subscription.paused'],
			start_time: '2026-09-03T00:00:00.000Z',
			end_time: '2026-10-03T00:00:00.000Z',
		});
	});
});
