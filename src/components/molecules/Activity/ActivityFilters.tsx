import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryBuilder } from '@/components/molecules/QueryBuilder';
import CustomerApi from '@/api/CustomerApi';
import { PlanApi } from '@/api/PlanApi';
import { ACTIVITY_ACTIONS, ACTIVITY_ACTOR_TYPES, ACTIVITY_ENTITY_TYPES } from '@/constants/activity';
import { DataType, FilterCondition, FilterField, FilterFieldType, FilterOperator } from '@/types/common/QueryBuilder';
import { ActivityQuery } from '@/types/dto/ActivityLog';
import { labelFor } from './entityRegistry';

// eslint-disable-next-line react-refresh/only-export-components
export const conditionsToQuery = (conditions: FilterCondition[]): Partial<ActivityQuery> => {
	const q: Partial<ActivityQuery> = {};
	for (const c of conditions) {
		switch (c.field) {
			case 'entity_type':
			case 'entity_id':
			case 'actor_type':
			case 'actor_id':
			case 'request_id':
			case 'customer_id':
				if (c.operator === FilterOperator.EQUAL && c.valueString) q[c.field] = c.valueString;
				break;
			case 'actions':
				if (c.operator === FilterOperator.IN && c.valueArray?.length) q.actions = c.valueArray;
				break;
			case 'occurred_at':
				if (c.operator === FilterOperator.AFTER && c.valueDate) q.start_time = c.valueDate.toISOString();
				if (c.operator === FilterOperator.BEFORE && c.valueDate) q.end_time = c.valueDate.toISOString();
				break;
		}
	}
	return q;
};

type Row = Record<string, unknown> & { id: string };

const entitySearch = (type: string) => {
	switch (type) {
		case 'customer':
			return async (query: string) => {
				const res = await CustomerApi.getCustomers({ limit: 10 });
				const needle = query.toLowerCase();
				return (res.items as unknown as Row[])
					.filter(
						(r) =>
							!needle ||
							String(r.name ?? r.external_id ?? '')
								.toLowerCase()
								.includes(needle),
					)
					.map((r) => ({ value: r.id, label: labelFor('customer', r), data: r }));
			};
		case 'plan':
			return async (query: string) => {
				const res = await PlanApi.getPlansByFilter({ limit: 10 });
				const needle = query.toLowerCase();
				return (res.items as unknown as Row[])
					.filter(
						(r) =>
							!needle ||
							String(r.name ?? '')
								.toLowerCase()
								.includes(needle),
					)
					.map((r) => ({ value: r.id, label: labelFor('plan', r), data: r }));
			};
		default:
			return null;
	}
};

interface Props {
	value: FilterCondition[];
	onChange: (f: FilterCondition[]) => void;
}

const ActivityFilters: FC<Props> = ({ value, onChange }) => {
	const { t } = useTranslation('activity');
	const entityType = value.find((c) => c.field === 'entity_type' && c.operator === FilterOperator.EQUAL)?.valueString ?? '';

	const fields = useMemo<FilterField[]>(() => {
		const search = entitySearch(entityType);
		const entityIdField: FilterField = search
			? {
					field: 'entity_id',
					label: t('filters.entity'),
					fieldType: FilterFieldType.COMBOBOX,
					operators: [FilterOperator.EQUAL],
					dataType: DataType.STRING,
					asyncConfig: { searchFn: search },
				}
			: {
					field: 'entity_id',
					label: t('filters.entityId'),
					fieldType: FilterFieldType.INPUT,
					operators: [FilterOperator.EQUAL],
					dataType: DataType.STRING,
				};
		return [
			{
				field: 'entity_type',
				label: t('filters.entityType'),
				fieldType: FilterFieldType.SELECT,
				operators: [FilterOperator.EQUAL],
				dataType: DataType.STRING,
				options: ACTIVITY_ENTITY_TYPES.map((v) => ({ value: v, label: t(`entity.${v}`, { defaultValue: v.replace(/_/g, ' ') }) })),
			},
			entityIdField,
			{
				field: 'actions',
				label: t('filters.actions'),
				fieldType: FilterFieldType.MULTI_SELECT,
				operators: [FilterOperator.IN],
				dataType: DataType.ARRAY,
				options: ACTIVITY_ACTIONS.map((v) => ({ value: v, label: v })),
			},
			{
				field: 'actor_type',
				label: t('filters.actorType'),
				fieldType: FilterFieldType.SELECT,
				operators: [FilterOperator.EQUAL],
				dataType: DataType.STRING,
				options: ACTIVITY_ACTOR_TYPES.map((v) => ({ value: v, label: t(`actor.${v}`, { defaultValue: v.replace(/_/g, ' ') }) })),
			},
			{
				field: 'actor_id',
				label: t('filters.actorId'),
				fieldType: FilterFieldType.INPUT,
				operators: [FilterOperator.EQUAL],
				dataType: DataType.STRING,
			},
			{
				field: 'customer_id',
				label: t('filters.customerId'),
				fieldType: FilterFieldType.INPUT,
				operators: [FilterOperator.EQUAL],
				dataType: DataType.STRING,
			},
			{
				field: 'request_id',
				label: t('filters.requestId'),
				fieldType: FilterFieldType.INPUT,
				operators: [FilterOperator.EQUAL],
				dataType: DataType.STRING,
			},
			{
				field: 'occurred_at',
				label: t('filters.occurredAt'),
				fieldType: FilterFieldType.DATEPICKER,
				operators: [FilterOperator.AFTER, FilterOperator.BEFORE],
				dataType: DataType.DATE,
			},
		];
	}, [entityType, t]);

	return <QueryBuilder filterOptions={fields} filters={value} onFilterChange={onChange} />;
};

export default ActivityFilters;
