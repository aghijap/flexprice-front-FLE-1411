import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Card, CardHeader, SearchableSelect, Toggle } from '@/components/atoms';
import { ActivityList } from '@/components/molecules/Activity';
import useCustomerEntities from '@/hooks/useCustomerEntities';
import { RouteNames } from '@/core/routes/Routes';
import { ActivityScope } from '@/types/dto/ActivityLog';

const HIDE_SYSTEM_KEY = 'activity.hideSystem';

const readHideSystem = () => {
	try {
		return localStorage.getItem(HIDE_SYSTEM_KEY) === '1';
	} catch {
		return false;
	}
};

export const scopeFromSelection = (selected: string, customerId: string): ActivityScope => {
	if (!selected) return { kind: 'customer', customerId };
	const idx = selected.indexOf(':');
	return { kind: 'entity', entityType: selected.slice(0, idx), entityId: selected.slice(idx + 1) };
};

const CustomerActivityTab = () => {
	const { t } = useTranslation('activity');
	const { id } = useParams();
	const customerId = id ?? '';
	const [selected, setSelected] = useState('');
	const [hideSystem, setHideSystem] = useState(readHideSystem);
	const { options } = useCustomerEntities(customerId);

	const query = useMemo(() => (hideSystem ? { exclude_actor_types: ['system'] } : {}), [hideSystem]);

	const toggleHideSystem = (v: boolean) => {
		setHideSystem(v);
		try {
			localStorage.setItem(HIDE_SYSTEM_KEY, v ? '1' : '0');
		} catch {
			// per-viewer convenience only
		}
	};

	const scope = scopeFromSelection(selected, customerId);

	return (
		<Card>
			<CardHeader
				title={t('tab.title')}
				cta={
					<Link to={`${RouteNames.activity}?customer_id=${customerId}`} className='text-sm text-content-link hover:underline'>
						{t('openInLog')}
					</Link>
				}
			/>
			<div className='flex flex-wrap items-center justify-between gap-3 py-3'>
				<div className='min-w-[260px]'>
					<SearchableSelect options={options} value={selected} onChange={setSelected} placeholder={t('scope.allRelated')} />
				</div>
				<Toggle checked={hideSystem} onChange={toggleHideSystem} label={t('toggle.hideSystem')} />
			</div>
			<ActivityList
				key={selected || 'all'}
				scope={scope}
				query={query}
				pageSize={25}
				customerId={customerId}
				emptyMessage={t('list.empty')}
			/>
		</Card>
	);
};

export default CustomerActivityTab;
