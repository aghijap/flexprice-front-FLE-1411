import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Loader } from '@/components/atoms';
import useActivityList from '@/hooks/useActivityList';
import useQueryParams from '@/hooks/useQueryParams';
import { ActivityItem, ActivityQuery, ActivityScope } from '@/types/dto/ActivityLog';
import ActivityRow from './ActivityRow';
import ActivityDetailSheet from './ActivityDetailSheet';

export interface ActivityListProps {
	scope: ActivityScope;
	query?: Partial<ActivityQuery>;
	pageSize?: number;
	compact?: boolean;
	inline?: boolean;
	emptyMessage?: string;
	onOpen?: (id: string) => void;
	customerId?: string;
}

const dayKey = (iso: string) =>
	new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const ActivityList: FC<ActivityListProps> = ({ scope, query, pageSize = 50, compact, inline, emptyMessage, onOpen, customerId }) => {
	const { t } = useTranslation('activity');
	const { items, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage, error, refetch } = useActivityList({
		scope,
		query,
		pageSize,
	});
	const { queryParams, setQueryParam } = useQueryParams<{ activity: string }>({ activity: '' });
	const openId = inline ? '' : queryParams.activity;

	const open = (id: string) => {
		if (onOpen) return onOpen(id);
		if (!inline) setQueryParam('activity', id);
	};
	const close = () => setQueryParam('activity', '');

	const groups = useMemo(() => {
		if (compact || inline) return [{ day: '', rows: items }];
		const map = new Map<string, ActivityItem[]>();
		items.forEach((it) => {
			const k = dayKey(it.occurred_at);
			map.set(k, [...(map.get(k) ?? []), it]);
		});
		return [...map.entries()].map(([day, rows]) => ({ day, rows }));
	}, [items, compact, inline]);

	if (isLoading) return <Loader />;
	if (error) {
		return (
			<div className='text-sm text-content-muted flex items-center gap-3'>
				<span>{t('list.error')}</span>
				<Button variant='outline' onClick={() => refetch()}>
					{t('list.retry')}
				</Button>
			</div>
		);
	}
	if (items.length === 0) return <div className='text-sm text-content-muted py-6 text-center'>{emptyMessage ?? t('list.empty')}</div>;

	return (
		<div className='grid gap-1'>
			{groups.map(({ day, rows }) => (
				<div key={day || 'all'}>
					{day && (
						<div data-testid='activity-day' className='text-[11px] font-semibold tracking-wide uppercase text-content-muted pt-3 pb-1'>
							{day}
						</div>
					)}
					{rows.map((it) => (
						<ActivityRow key={it.id} item={it} onOpen={open} compact={compact} />
					))}
				</div>
			))}
			{hasNextPage && (
				<div className='pt-2'>
					<Button variant='outline' onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
						{t('list.loadMore')}
					</Button>
				</div>
			)}
			{!inline && openId && <ActivityDetailSheet id={openId} onClose={close} customerId={customerId} loaded={items} />}
		</div>
	);
};

export default ActivityList;
