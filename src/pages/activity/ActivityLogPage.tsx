import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Page, Toggle } from '@/components/atoms';
import { ActivityList } from '@/components/molecules/Activity';
import ActivityFilters, { conditionsToQuery } from '@/components/molecules/Activity/ActivityFilters';
import { DataType, FilterCondition, FilterOperator } from '@/types/common/QueryBuilder';

const HIDE_SYSTEM_KEY = 'activity.hideSystem';

const readHideSystem = () => {
	try {
		return localStorage.getItem(HIDE_SYSTEM_KEY) === '1';
	} catch {
		return false;
	}
};

export const initialConditions = (customerId?: string | null): FilterCondition[] => {
	const conditions: FilterCondition[] = [
		{
			id: 'occurred_at_after',
			field: 'occurred_at',
			operator: FilterOperator.AFTER,
			dataType: DataType.DATE,
			valueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
		},
	];
	if (customerId) {
		conditions.push({
			id: 'customer_id',
			field: 'customer_id',
			operator: FilterOperator.EQUAL,
			dataType: DataType.STRING,
			valueString: customerId,
		});
	}
	return conditions;
};

const ActivityLogPage = () => {
	const { t } = useTranslation('activity');
	const [searchParams] = useSearchParams();
	const [conditions, setConditions] = useState<FilterCondition[]>(() => initialConditions(searchParams.get('customer_id')));
	const [hideSystem, setHideSystem] = useState(readHideSystem);

	const query = useMemo(
		() => ({ ...conditionsToQuery(conditions), ...(hideSystem ? { exclude_actor_types: ['system'] } : {}) }),
		[conditions, hideSystem],
	);

	const toggleHideSystem = (v: boolean) => {
		setHideSystem(v);
		try {
			localStorage.setItem(HIDE_SYSTEM_KEY, v ? '1' : '0');
		} catch {
			// per-viewer convenience only
		}
	};

	return (
		<Page heading={t('page.title')} documentTitle={t('page.title')}>
			<p className='text-sm text-content-muted -mt-2 mb-4'>{t('page.subtitle')}</p>
			<div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
				<ActivityFilters value={conditions} onChange={setConditions} />
				<Toggle checked={hideSystem} onChange={toggleHideSystem} label={t('toggle.hideSystem')} />
			</div>
			<ActivityList scope={{ kind: 'all' }} query={query} pageSize={50} />
		</Page>
	);
};

export default ActivityLogPage;
